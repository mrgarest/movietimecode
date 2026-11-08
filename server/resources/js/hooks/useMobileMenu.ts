import { useState, useCallback } from 'react';
import { useBodyScrollLock } from './useBodyScrollLock';

export function useMobileMenu() {
    const [isOpen, setOpen] = useState<boolean>(false);
    const [isVisible, setVisible] = useState<boolean>(false);

    useBodyScrollLock(isOpen);

    const toggleMenu = useCallback((targetState?: boolean) => {
        const nextState = targetState !== undefined ? targetState : !isOpen;

        if (nextState) {
            setOpen(true);
            setTimeout(() => setVisible(true), 10);
        } else {
            setVisible(false);
            setTimeout(() => setOpen(false), 300);
        }
    }, [isOpen]);

    return { isOpen, isVisible, toggleMenu };
}