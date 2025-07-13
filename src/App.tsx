import {
    DarkMode,
    HStack,
    IconButton,
    Input,
    InputGroup,
    InputRightAddon,
    Select,
    Spacer,
    Text,
    useToast,
    VStack,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import {
    BiReset,
    BiSolidChevronsDown,
    BiSolidChevronsUp,
    BiSolidShow,
} from "react-icons/bi";
import { cards } from "./cards";
import { CardDisplay } from "./components/CardDisplay";
import type { Card } from "./types";

function idToCardNumber(id: string): number {
    console.log(id, parseInt(id.replace(/:/g, ""), 16));
    // Make sure to remove all colons and crop the string to 14 characters
    id = id.replace(/:/g, "").slice(0, 14);

    // Convert "##:##:##:##:##:##:##" to "0000 0000 0000 0000"
    return parseInt(id, 16);
}

function App() {
    const [currentCard, setCurrentCard] = useState<Card | null>(null);
    const [mode, setMode] = useState<
        "read" | "increase" | "decrease" | "repair"
    >("read");
    // const [_iterator, reset] = useReducer((prev) => prev + 1, 0);
    const toast = useToast();

    const [amount, setAmount] = useState<number>(0);
    const [note, setNote] = useState<string>("");
    const [overdraft, setOverdraft] = useState<"decline" | "zero" | "negative">(
        "decline"
    );
    const [searchMode, setSearchMode] = useState<"search" | "manual">("search");
    const [resetName, setResetName] = useState<string>("");

    const ndef = useMemo(() => {
        if (!("NDEFReader" in window)) {
            return null;
        }
        const ndef = new NDEFReader();

        return ndef;
    }, []);

    useEffect(() => {
        if (!ndef) {
            return;
        }

        const onError = () => {
            toast({
                title: "Chyba při čtení NFC",
                description:
                    "Zkontrolujte, zda je NFC povoleno a zda je karta správně přiložena.",
                status: "error",
            });
        };

        ndef.addEventListener("readingerror", onError);

        return () => {
            ndef.removeEventListener("readingerror", onError);
        };
    }, [ndef, toast]);

    useEffect(() => {
        if (!ndef) {
            return;
        }

        const parseCardDetails = (
            { message, serialNumber }: NDEFReadingEvent,
            doToast?: boolean
        ): Card => {
            if (!message || !message.records) {
                if (doToast)
                    toast({
                        title: "Čtení se nezdařilo",
                        description: "Karta nebyla rozpoznána.",
                        status: "error",
                    });

                return {
                    id: idToCardNumber(serialNumber),
                };
            }

            const nameData = message.records.filter(
                (record) => record.mediaType === "nam"
            )[0]?.data;
            const balanceData = message.records.filter(
                (record) => record.mediaType === "bal"
            )[0]?.data;

            if (!nameData || !balanceData) {
                if (doToast)
                    toast({
                        title: "Neplatná karta",
                        description: "Toto není platná karta naší banky.",
                        status: "error",
                    });

                return {
                    id: idToCardNumber(serialNumber),
                };
            }

            const name = new TextDecoder().decode(nameData);
            const balance = new DataView(balanceData.buffer).getFloat32(
                0,
                true
            );

            return {
                id: idToCardNumber(serialNumber),
                cardData: { holder: name, balance: balance },
            };
        };

        switch (mode) {
            case "read": {
                const onSuccess = ((event: NDEFReadingEvent) => {
                    setCurrentCard(parseCardDetails(event, true));
                }) as EventListener;
                ndef.addEventListener("reading", onSuccess);

                const signalController = new AbortController();

                ndef.scan({
                    signal: signalController.signal,
                }).catch((error) => {
                    toast({
                        title: "Chyba při skenování NFC",
                        description: error.message,
                        status: "error",
                    });
                });

                return () => {
                    ndef.removeEventListener("reading", onSuccess);
                    signalController.abort();
                };
            }
            case "increase":
            case "decrease": {
                const signalController = new AbortController();

                const onSuccess = ((event: NDEFReadingEvent) => {
                    const cardDetails = parseCardDetails(event, true);
                    setCurrentCard(cardDetails);
                    signalController.abort();

                    if (!cardDetails.cardData) {
                        toast({
                            title: "Karta není registrována",
                            description: "Karta není registrována v systému.",
                            status: "error",
                        });
                        setMode("read");
                        return;
                    }

                    setCurrentCard(cardDetails);

                    let newBalance =
                        mode === "increase"
                            ? cardDetails.cardData.balance + amount
                            : cardDetails.cardData.balance - amount;

                    if (newBalance < 0) {
                        switch (overdraft) {
                            case "decline":
                                toast({
                                    title: "Zůstatek je nedostatečný",
                                    description:
                                        "Nemůžete provést tuto transakci, protože zůstatek je nedostatečný.",
                                    status: "error",
                                });
                                setMode("read");
                                return;
                            case "zero":
                                toast({
                                    title: "Zůstatek byl nedostatečný",
                                    description: `Zůstatek byl vynulován.`,
                                    status: "warning",
                                });
                                newBalance = 0;
                                break;
                            case "negative":
                                toast({
                                    title: "Zůstatek byl podčerpán",
                                    description: `Zůstatek byl podčerpán na ${newBalance.toFixed(
                                        0
                                    )}$`,
                                    status: "warning",
                                });
                                break;
                        }
                    }

                    // Now do the writing
                    const tryWrite = async () => {
                        try {
                            await ndef.write({
                                records: [
                                    {
                                        recordType: "mime",
                                        mediaType: "bal",
                                        data: new DataView(
                                            new Float32Array([
                                                newBalance,
                                            ]).buffer
                                        ),
                                    },
                                    {
                                        recordType: "mime",
                                        mediaType: "nam",
                                        data: new TextEncoder().encode(
                                            cardDetails.cardData!.holder
                                        ),
                                    },
                                ],
                            });
                            toast({
                                title: "Karta aktualizována",
                                description: `Nový zůstatek: ${newBalance
                                    .toFixed(0)
                                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")} $`,
                                status: "success",
                            });
                            setCurrentCard({
                                ...cardDetails,
                                cardData: {
                                    ...cardDetails.cardData!,
                                    balance: newBalance,
                                },
                            });
                            setMode("read");
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        } catch (_error) {
                            toast({
                                title: "Chyba při zápisu na kartu",
                                description: "Zkouším to znovu...",
                                status: "error",
                            });

                            tryWrite();
                            return;
                        }
                    };

                    tryWrite();
                }) as EventListener;
                ndef.addEventListener("reading", onSuccess);

                ndef.scan({
                    signal: signalController.signal,
                }).catch((error) => {
                    toast({
                        title: "Chyba při skenování NFC",
                        description: error.message,
                        status: "error",
                    });
                });

                return () => {
                    ndef.removeEventListener("reading", onSuccess);
                    signalController.abort();
                };
            }
            case "repair": {
                const signalController = new AbortController();

                const onSuccess = ((event: NDEFReadingEvent) => {
                    const cardDetails = parseCardDetails(event);
                    signalController.abort();

                    if (
                        cardDetails.cardData &&
                        currentCard?.id !== cardDetails.id
                    ) {
                        toast({
                            title: "Karta je registrována a funguje",
                            description:
                                "Karta již patří někomu jinému. Pokud ji chcete přesto přepsat, naskenujte ji znovu.",
                            status: "error",
                        });
                        setMode("read");
                        return;
                    }

                    setCurrentCard(cardDetails);

                    // Now do the writing
                    (async () => {
                        try {
                            let holder =
                                searchMode === "search"
                                    ? cards[cardDetails.id]
                                    : resetName;

                            // Remove diacritics and trim the name
                            if (holder) {
                                holder = holder
                                    .normalize("NFD")
                                    .replace(/[\u0300-\u036f]/g, "")
                                    .trim();
                            }

                            if (!holder) {
                                toast({
                                    title: "Tato karta není registrována",
                                    description:
                                        "Karta není registrována v systému.",
                                    status: "error",
                                });
                                setMode("read");
                                return;
                            }

                            await ndef.write({
                                records: [
                                    {
                                        recordType: "mime",
                                        mediaType: "bal",
                                        data: new DataView(
                                            new Float32Array([amount]).buffer
                                        ),
                                    },
                                    {
                                        recordType: "mime",
                                        mediaType: "nam",
                                        data: new TextEncoder().encode(holder),
                                    },
                                ],
                            });
                            toast({
                                title: "Karta inicializována",
                                description: `Karta byla úspěšně opravena a patří nyní ${holder}.`,
                                status: "success",
                            });
                            setCurrentCard({
                                ...cardDetails,
                                cardData: {
                                    holder: holder,
                                    balance: 0,
                                },
                            });
                            setMode("read");
                        } catch (error) {
                            toast({
                                title: "Chyba při zápisu na kartu",
                                description:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                                status: "error",
                            });
                            setMode("read");
                            return;
                        }
                    })();
                }) as EventListener;
                ndef.addEventListener("reading", onSuccess);

                ndef.scan({
                    signal: signalController.signal,
                }).catch((error) => {
                    toast({
                        title: "Chyba při skenování NFC",
                        description: error.message,
                        status: "error",
                    });
                });

                return () => {
                    ndef.removeEventListener("reading", onSuccess);
                    signalController.abort();
                };
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast, ndef, mode, amount, overdraft, note, searchMode, resetName]);

    if (!ndef) {
        return (
            <DarkMode>
                <VStack
                    h="100svh"
                    w="100vw"
                    bg="gray.900"
                    align="center"
                    justify="center"
                    p={6}
                    color="gray.100"
                >
                    <Text fontSize="xl">NFC není podporováno</Text>
                </VStack>
            </DarkMode>
        );
    }

    return (
        <DarkMode>
            <VStack
                h="100svh"
                w="100vw"
                bg="gray.900"
                align="center"
                justify="start"
                p={6}
                color="gray.100"
                spacing={0}
            >
                <CardDisplay card={currentCard} mb={10} />
                <HStack>
                    <IconButton
                        aria-label="Číst"
                        icon={<BiSolidShow />}
                        size="lg"
                        fontSize="2xl"
                        onClick={() => setMode("read")}
                        colorScheme={mode === "read" ? "green" : undefined}
                    />
                    <IconButton
                        aria-label="Přidat"
                        icon={<BiSolidChevronsUp />}
                        size="lg"
                        fontSize="2xl"
                        onClick={() => setMode("increase")}
                        colorScheme={mode === "increase" ? "green" : undefined}
                    />
                    <IconButton
                        aria-label="Odebrat"
                        icon={<BiSolidChevronsDown />}
                        size="lg"
                        fontSize="2xl"
                        onClick={() => setMode("decrease")}
                        colorScheme={mode === "decrease" ? "green" : undefined}
                    />
                    <Spacer />
                    <IconButton
                        aria-label="Číst"
                        icon={<BiReset />}
                        size="lg"
                        fontSize="2xl"
                        onClick={() => setMode("repair")}
                        colorScheme={mode === "repair" ? "red" : undefined}
                    />
                </HStack>
                <VStack mt={10}>
                    {(mode === "increase" || mode === "decrease") && (
                        <>
                            <HStack w="full">
                                <Text w={32} flexGrow={0} flexShrink={0}>
                                    Částka
                                </Text>
                                <InputGroup>
                                    <Input
                                        type="number"
                                        flexGrow={1}
                                        flexShrink={1}
                                        value={amount.toString()}
                                        onChange={(e) => {
                                            const value = parseFloat(
                                                e.target.value
                                            );
                                            if (!isNaN(value)) {
                                                setAmount(value);
                                            } else {
                                                setAmount(0);
                                            }
                                        }}
                                    ></Input>
                                    <InputRightAddon>$</InputRightAddon>
                                </InputGroup>
                            </HStack>
                            <HStack w="full">
                                <Text w={32} flexGrow={0} flexShrink={0}>
                                    Poznámka
                                </Text>
                                <Input
                                    type="text"
                                    flexGrow={1}
                                    flexShrink={1}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                ></Input>
                            </HStack>
                            {mode === "decrease" && (
                                <HStack w="full" mt={4}>
                                    <Text w={32} flexGrow={0} flexShrink={0}>
                                        Při podčerpání
                                    </Text>
                                    <Select
                                        flexGrow={1}
                                        flexShrink={1}
                                        value={overdraft}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setOverdraft(
                                                value as
                                                    | "decline"
                                                    | "zero"
                                                    | "negative"
                                            );
                                        }}
                                    >
                                        <option value={"decline"}>
                                            Zamítnout
                                        </option>
                                        <option value={"zero"}>
                                            Vynulovat
                                        </option>
                                        <option value={"negative"}>
                                            Podčerpat
                                        </option>
                                    </Select>
                                </HStack>
                            )}
                        </>
                    )}
                    {mode === "repair" && (
                        <>
                            <HStack w="full">
                                <Text w={32} flexGrow={0} flexShrink={0}>
                                    Údaje
                                </Text>
                                <Select
                                    flexGrow={1}
                                    flexShrink={1}
                                    value={searchMode}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchMode(
                                            value as "search" | "manual"
                                        );
                                    }}
                                >
                                    <option value={"search"}>
                                        Vyhledat v databázi
                                    </option>
                                    <option value={"manual"}>
                                        Zadat manuálně
                                    </option>
                                </Select>
                            </HStack>
                            <HStack w="full">
                                <Text w={32} flexGrow={0} flexShrink={0}>
                                    Iniciální částka
                                </Text>
                                <InputGroup>
                                    <Input
                                        type="number"
                                        flexGrow={1}
                                        flexShrink={1}
                                        value={amount}
                                        onChange={(e) => {
                                            const value = parseFloat(
                                                e.target.value
                                            );
                                            if (!isNaN(value)) {
                                                setAmount(value);
                                            } else {
                                                setAmount(0);
                                            }
                                        }}
                                    ></Input>
                                    <InputRightAddon>$</InputRightAddon>
                                </InputGroup>
                            </HStack>
                            {searchMode === "manual" && (
                                <HStack w="full" mt={4}>
                                    <Text w={32} flexGrow={0} flexShrink={0}>
                                        Jméno držitele
                                    </Text>
                                    <Input
                                        type="text"
                                        flexGrow={1}
                                        flexShrink={1}
                                        value={resetName}
                                        onChange={(e) =>
                                            setResetName(e.target.value)
                                        }
                                    ></Input>
                                </HStack>
                            )}
                        </>
                    )}
                </VStack>
            </VStack>
        </DarkMode>
    );
}

export default App;
