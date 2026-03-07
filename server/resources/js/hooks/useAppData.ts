export function useAppData<T>(): T | null {
    const data = (window as any).__APP_DATA__ as T | undefined;
    
    if (data) {
        delete (window as any).__APP_DATA__;
        return data;
    }
    
    return null;
}