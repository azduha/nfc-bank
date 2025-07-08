import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { PermissionWrapper } from "./PermissionWrapper";

// add this to prompt for a refresh
const updateSW = registerSW({
    onNeedRefresh() {
        if (confirm("New content available. Reload?")) {
            updateSW(true);
        }
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
                    },
                    body: {
                        position: "relative",
                    },
                },
            },
        })}
    >
        <PermissionWrapper>
            <App />
        </PermissionWrapper>
    </ChakraProvider>
);
