interface StorageData {
    [key: string]: unknown;
}

export const ManageLocalStorage = {
    get<T = string>(key: string): T | null {
        if (!key) return null;
        const item = localStorage.getItem(key);
        if (item === null) return null;
        
        try {
            return JSON.parse(item) as T;
        } catch {
            return item as T;
        }
    },

    set(key: string, data: StorageData | string): void {
        if (!key) return;
        const value = typeof data === "string" ? data : JSON.stringify(data);
        localStorage.setItem(key, value);
    },

    delete(key: string): void {
        if (!key) return;
        localStorage.removeItem(key);
    },

    clear(): void {
        localStorage.clear();
    }
};