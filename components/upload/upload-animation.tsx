"use client";

import dynamic from "next/dynamic";
import type { LottieComponentProps } from "lottie-react";

// Dynamic import to avoid SSR issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

// Lottie animation data (you can replace these with actual animation JSON files)
const uploadingAnimation = {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 60,
    w: 200,
    h: 200,
    nm: "Uploading",
    ddd: 0,
    assets: [],
    layers: [
        {
            ddd: 0,
            ind: 1,
            ty: 4,
            nm: "Circle",
            sr: 1,
            ks: {
                o: { a: 0, k: 100 },
                r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [360] }] },
                p: { a: 0, k: [100, 100, 0] },
                a: { a: 0, k: [0, 0, 0] },
                s: { a: 0, k: [100, 100, 100] },
            },
            shapes: [
                {
                    ty: "gr",
                    it: [
                        {
                            ty: "el",
                            s: { a: 0, k: [80, 80] },
                            p: { a: 0, k: [0, 0] },
                        },
                        {
                            ty: "st",
                            c: { a: 0, k: [0.2, 0.6, 1, 1] },
                            o: { a: 0, k: 100 },
                            w: { a: 0, k: 8 },
                        },
                    ],
                },
            ],
        },
    ],
};

const successAnimation = {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 60,
    w: 200,
    h: 200,
    nm: "Success",
    ddd: 0,
    assets: [],
    layers: [
        {
            ddd: 0,
            ind: 1,
            ty: 4,
            nm: "Checkmark",
            sr: 1,
            ks: {
                o: { a: 0, k: 100 },
                r: { a: 0, k: 0 },
                p: { a: 0, k: [100, 100, 0] },
                a: { a: 0, k: [0, 0, 0] },
                s: { a: 1, k: [{ t: 0, s: [0, 0, 100] }, { t: 30, s: [100, 100, 100] }] },
            },
            shapes: [
                {
                    ty: "gr",
                    it: [
                        {
                            ty: "el",
                            s: { a: 0, k: [80, 80] },
                            p: { a: 0, k: [0, 0] },
                        },
                        {
                            ty: "fl",
                            c: { a: 0, k: [0.2, 0.8, 0.4, 1] },
                            o: { a: 0, k: 100 },
                        },
                    ],
                },
            ],
        },
    ],
};

const errorAnimation = {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 60,
    w: 200,
    h: 200,
    nm: "Error",
    ddd: 0,
    assets: [],
    layers: [
        {
            ddd: 0,
            ind: 1,
            ty: 4,
            nm: "X",
            sr: 1,
            ks: {
                o: { a: 0, k: 100 },
                r: { a: 1, k: [{ t: 0, s: [0] }, { t: 30, s: [90] }] },
                p: { a: 0, k: [100, 100, 0] },
                a: { a: 0, k: [0, 0, 0] },
                s: { a: 0, k: [100, 100, 100] },
            },
            shapes: [
                {
                    ty: "gr",
                    it: [
                        {
                            ty: "el",
                            s: { a: 0, k: [80, 80] },
                            p: { a: 0, k: [0, 0] },
                        },
                        {
                            ty: "fl",
                            c: { a: 0, k: [0.9, 0.2, 0.2, 1] },
                            o: { a: 0, k: 100 },
                        },
                    ],
                },
            ],
        },
    ],
};

const processingAnimation = {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 60,
    w: 200,
    h: 200,
    nm: "Processing",
    ddd: 0,
    assets: [],
    layers: [
        {
            ddd: 0,
            ind: 1,
            ty: 4,
            nm: "Dots",
            sr: 1,
            ks: {
                o: { a: 1, k: [{ t: 0, s: [100] }, { t: 30, s: [50] }, { t: 60, s: [100] }] },
                r: { a: 0, k: 0 },
                p: { a: 0, k: [100, 100, 0] },
                a: { a: 0, k: [0, 0, 0] },
                s: { a: 0, k: [100, 100, 100] },
            },
            shapes: [
                {
                    ty: "gr",
                    it: [
                        {
                            ty: "el",
                            s: { a: 0, k: [60, 60] },
                            p: { a: 0, k: [0, 0] },
                        },
                        {
                            ty: "fl",
                            c: { a: 0, k: [0.4, 0.4, 0.9, 1] },
                            o: { a: 0, k: 100 },
                        },
                    ],
                },
            ],
        },
    ],
};

interface UploadAnimationProps {
    status: "idle" | "uploading" | "processing" | "success" | "error" | "paused";
    size?: number;
}

export function UploadAnimation({ status, size = 120 }: UploadAnimationProps) {
    const getAnimation = () => {
        switch (status) {
            case "uploading":
                return uploadingAnimation;
            case "success":
                return successAnimation;
            case "error":
                return errorAnimation;
            case "processing":
                return processingAnimation;
            default:
                return null;
        }
    };

    const animation = getAnimation();

    if (!animation) return null;

    return (
        <div style={{ width: size, height: size }}>
            <Lottie
                animationData={animation}
                loop={status === "uploading" || status === "processing"}
                autoplay
            />
        </div>
    );
}
