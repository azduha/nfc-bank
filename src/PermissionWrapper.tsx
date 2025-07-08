import { Button, Center, DarkMode } from "@chakra-ui/react";
import { useState } from "react";

export function PermissionWrapper({ children }: { children: React.ReactNode }) {
    const [clicked, setClicked] = useState(false);

    if (clicked) {
        return children;
    }

    return (
        <Center w="100vw" h="100svh">
            <DarkMode>
                <Button onClick={() => setClicked(true)}>
                    Spustit aplikaci
                </Button>
            </DarkMode>
        </Center>
    );
}
