"use client";

import dynamic from "next/dynamic";
import type { LottieComponentProps } from "lottie-react";

// Import Lottie animation files
import excelUploadAnim from "@/public/lottiefiles/Excel_Upload.json";
import scanningDocumentAnim from "@/public/lottiefiles/Scanning_Document.json";
import successCheckAnim from "@/public/lottiefiles/Success_Check.json";

// Dynamic import to avoid SSR issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

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

interface UploadAnimationProps {
    status: "idle" | "uploading" | "processing" | "success" | "error" | "paused" | "completed";
    size?: number;
}

export function UploadAnimation({ status, size = 120 }: UploadAnimationProps) {
    const getAnimation = () => {
        switch (status) {
            case "uploading":
                return excelUploadAnim;
            case "success":
                return successCheckAnim;
            case "error":
                return errorAnimation;
            case "processing":
                return scanningDocumentAnim;
            case "completed":
                return successCheckAnim;
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
