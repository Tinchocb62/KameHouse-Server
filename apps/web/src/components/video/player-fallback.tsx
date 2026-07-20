import React from "react";

export function PlayerFallback() {
    return (
        <div className="fixed inset-0 bg-black flex flex-col justify-center items-center z-[100]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-secondary"></div>
        </div>
    );
}
