import './bootstrap';
import './lib/i18n';
import { createRoot } from "react-dom/client";
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { useUserStore } from './store/useUserStore';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactGA from "react-ga4";

// Google Analytics initialization
const gaId = (import.meta as any).env.VITE_GOOGLE_ANALYTICS;
if (gaId) {
    ReactGA.initialize(gaId);
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

function App() {
    const checkAuth = useUserStore(state => state.checkAuth);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        ReactGA.send({
            hitType: "pageview",
            page: location.pathname + location.search
        });
    }, [location]);

    return <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>;
}

// Track initial page load
router.subscribe((state) => {
    ReactGA.send({
        hitType: "pageview",
        page: state.location.pathname + state.location.search
    });
});


// Render the app
const container = document.getElementById("app");
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}


