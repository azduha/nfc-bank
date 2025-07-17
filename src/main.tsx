import {
    ChakraProvider,
    extendTheme,
    type ChakraTheme,
} from "@chakra-ui/react";
import moment from "moment/min/moment-with-locales";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { PermissionWrapper } from "./PermissionWrapper";

moment.locale("cs");

// add this to prompt for a refresh
const updateSW = registerSW({
    onNeedRefresh() {
        (async () => {
            await updateSW(true);
            // Reload the page after the service worker is updated
            window.location.reload();
        })();
    },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <ChakraProvider
        theme={extendTheme({
            /* overflow hidden wh full */
            styles: {
                global: {
                    "html, body": {
                        overflow: "hidden",
                        height: "100vh",
                        width: "100vw",
                        margin: 0,
                        backgroundColor: "#191925",
                        overscrollBehavior: "none",
                    },
                    body: {
                        position: "relative",
                    },
                },
            },
        } as Partial<ChakraTheme>)}
    >
        <PermissionWrapper>
            <App />
        </PermissionWrapper>
    </ChakraProvider>
);
