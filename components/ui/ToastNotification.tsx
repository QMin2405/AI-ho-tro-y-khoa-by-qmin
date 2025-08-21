
import React, { useEffect } from 'react';

export const ToastNotification = ({ message, onDismiss }: { message: string; onDismiss: () => void; }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in">
            {message}
        </div>
    );
};
