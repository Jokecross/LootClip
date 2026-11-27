"""
Cadrage 9:16 d'une vidéo horizontale : pour chaque plan, où est le visage qui compte.

  python visages.py video.mp4 modele_yunet.onnx  ->  JSON sur la sortie standard

Sortie : [{"debut": s, "fin": s, "mise": "seul"|"duo", "cx": 0..1, "duo": [[cx, cy], [cx, cy]]}, ...]
  - un plan = une suite d'images sans coupe franche (changement de caméra) ;
  - seul : un visage domine, cadre 9:16 centré sur lui (cx en part de la largeur) ;
  - duo  : deux visages de taille proche (plan large), on les empile en haut et en bas ;
  - stream : vidéo de jeu avec facecam dans un coin : facecam en haut, jeu en bas
             ("cam" = cadre de la facecam en part de l'image : [x, y, l, h]) ;
  - jeu  : plan d'une vidéo de jeu où la facecam n'est pas là : cadre 9:16 au centre.
Un cadre fixe par plan : c'est ce que ferait un monteur, et ça ne tremble pas.
"""
import json
import sys

import cv2
import numpy as np

PAS = 0.2          # une image analysée toutes les 0,2 s
SEUIL_COUPE = 0.25  # écart d'histogramme au-delà duquel on considère qu'il y a une coupe
PLAN_MIN = 0.6     # un plan plus court est fondu dans le précédent


def histo(img):
    hsv = cv2.cvtColor(cv2.resize(img, (160, 90)), cv2.COLOR_BGR2HSV)
    h = cv2.calcHist([hsv], [0, 1], None, [32, 16], [0, 180, 0, 256])
    return cv2.normalize(h, h).flatten()


# Facecam : petit visage, dans un coin, au même endroit pendant une bonne partie de la vidéo
CAM_SURFACE_MAX = 0.012
CAM_PRESENCE = 0.4


def dans_un_coin(v):
    return v[1] < CAM_SURFACE_MAX and (v[0] < 0.3 or v[0] > 0.7) and (v[2] < 0.3 or v[2] > 0.7)


def sur_cam(v, cam):
    return abs(v[0] - cam["cx"]) < 0.03 and abs(v[2] - cam["cy"]) < 0.04 and v[1] < CAM_SURFACE_MAX


def facecam(echantillons):
    candidats = [v for e in echantillons for v in e[2] if dans_un_coin(v)]
    if len(candidats) < 5:
        return None
    cx = float(np.median([v[0] for v in candidats]))
    cy = float(np.median([v[2] for v in candidats]))
    base = {"cx": cx, "cy": cy}
    presents = [e for e in echantillons if any(sur_cam(v, base) for v in e[2])]
    if len(presents) < CAM_PRESENCE * len(echantillons):
        return None
    proches = [v for v in candidats if sur_cam(v, base)]
    lv = float(np.median([v[3] for v in proches]))  # largeur du visage, en part de la largeur
    # Facecam 16:9 d'environ 4,4 largeurs de visage, visage au milieu (un peu resserré pour ne pas prendre le bord)
    l = min(0.45, lv * 4.4)
    h = l  # en part de la hauteur, une largeur l (part de la largeur 16:9) donne une facecam 16:9 de hauteur l
    x = min(1 - l, max(0.0, cx - l / 2))
    y = min(1 - h, max(0.0, cy - h / 2))
    return {"cx": cx, "cy": cy, "cadre": [round(x, 4), round(y, 4), round(l, 4), round(h, 4)]}


def main(video, modele):
    cap = cv2.VideoCapture(video)
    ips = cap.get(cv2.CAP_PROP_FPS) or 25
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    largeur = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    hauteur = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duree = total / ips

    echelle = 640 / largeur
    lp, hp = 640, int(hauteur * echelle)
    detecteur = cv2.FaceDetectorYN.create(modele, "", (lp, hp), 0.75, 0.3, 50)

    # Analyse image par image (on décode tout, on n'examine qu'une image sur PAS)
    saut = max(1, round(ips * PAS))
    echantillons = []  # (t, histogramme, visages)
    k = 0
    while True:
        ok = cap.grab()
        if not ok:
            break
        if k % saut == 0:
            ok, img = cap.retrieve()
            if not ok:
                break
            petit = cv2.resize(img, (lp, hp))
            _, faces = detecteur.detect(petit)
            visages = []
            if faces is not None:
                for f in faces:
                    x, y, w, h = f[:4]
                    visages.append(((x + w / 2) / lp, w * h / (lp * hp), (y + h / 2) / hp, w / lp))
            echantillons.append((k / ips, histo(img), visages))
        k += 1
    cap.release()

    # Coupes : grosse différence d'histogramme entre deux échantillons voisins
    coupes = [0.0]
    for i in range(1, len(echantillons)):
        d = cv2.compareHist(echantillons[i - 1][1], echantillons[i][1], cv2.HISTCMP_BHATTACHARYYA)
        if d > SEUIL_COUPE:
            t = (echantillons[i - 1][0] + echantillons[i][0]) / 2
            if t - coupes[-1] >= PLAN_MIN:
                coupes.append(t)
    coupes.append(duree)

    cam = facecam(echantillons)

    plans = []
    for a, b in zip(coupes, coupes[1:]):
        if cam:
            dedans = [e for e in echantillons if a <= e[0] < b]
            avec = [e for e in dedans if any(sur_cam(v, cam) for v in e[2])]
            mise = "stream" if dedans and len(avec) >= 0.3 * len(dedans) else "jeu"
            plans.append({"debut": round(a, 3), "fin": round(b, 3), "visage": True, "mise": mise, "cx": 0.5, "cam": cam["cadre"]})
            continue
        dedans = [e for e in echantillons if a <= e[0] < b]
        # Visages qui comptent dans chaque image : au moins la moitié de la surface du plus grand
        nets = []
        for e in dedans:
            if not e[2]:
                continue
            grand = max(v[1] for v in e[2])
            nets.append(sorted([v for v in e[2] if v[1] >= grand * 0.5], key=lambda v: v[0]))
        plan = {"debut": round(a, 3), "fin": round(b, 3), "visage": bool(nets), "mise": "seul"}
        if nets:
            deux = [n for n in nets if len(n) >= 2]
            if len(deux) >= len(nets) * 0.6:
                gauche = [(n[0][0], n[0][2]) for n in deux]
                droite = [(n[-1][0], n[-1][2]) for n in deux]
                plan["mise"] = "duo"
                plan["duo"] = [[round(float(np.median([p[i] for p in c])), 4) for i in (0, 1)] for c in (gauche, droite)]
                plan["cx"] = 0.5
            else:
                plan["cx"] = round(float(np.median([max(n, key=lambda v: v[1])[0] for n in nets])), 4)
        else:
            plan["cx"] = plans[-1]["cx"] if plans else 0.5
        plans.append(plan)

    # Plan sans visage au tout début : on reprend le cadre du premier plan qui en a un
    premier = next((p["cx"] for p in plans if p["visage"]), 0.5)
    for p in plans:
        if p["visage"]:
            break
        p["cx"] = premier

    json.dump(plans, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
