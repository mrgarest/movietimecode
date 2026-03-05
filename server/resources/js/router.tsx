import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import PrivacyPage from "./pages/privacy";
import HomePage from "./pages";
import NotFoundPage from "./pages/not-found";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/dashboard";
import LogoutPage from "./pages/logout";
import TimecodePage from "./pages/dashboard/timecode";
import MovieDetailPage from "./pages/movies/detail";
import MovieWithTimecodesPage from "./pages/movies/with-timecodes";
import MovieSanctionPage from "./pages/dashboard/movies/sanctions";
import MovieSanctionAddPage from "./pages/dashboard/movies/sanctions/add";
import FaqPage from "./pages/faq";
import UsersPage from "./pages/dashboard/users";

const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout />,
        children: [
            { index: true, element: <HomePage /> },
            {
                path: "movies",
                children: [
                    { path: "timecodes", element: <MovieWithTimecodesPage /> },
                    { path: ":id", element: <MovieDetailPage /> }
                ]
            },
            { path: "/faq", element: <FaqPage /> },
            { path: "/privacy", element: <PrivacyPage /> },
            { path: "/logout", element: <LogoutPage /> },
            { path: "*", element: <NotFoundPage /> }
        ],
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: "/dashboard",
                element: <DashboardLayout />,
                children: [
                    { index: true, element: <DashboardPage /> },
                    { path: 'timecodes', element: <TimecodePage /> },
                    {
                        path: "movies",
                        children: [
                            { path: "sanctions", element: <MovieSanctionPage /> },
                            { path: "sanctions/add", element: <MovieSanctionAddPage /> },
                        ]
                    },
                    { path: 'users', element: <UsersPage /> }
                ],
            },
        ],
    },
]);

export default router;