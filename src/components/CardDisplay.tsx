import {
    AspectRatio,
    HStack,
    Icon,
    Spacer,
    Text,
    useToken,
    VStack,
    type BoxProps,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { BiCreditCard } from "react-icons/bi";
import type { Card } from "../types";

export interface CardDisplayProps extends BoxProps {
    card: Card | null;
}

export function CardDisplay({ card, ...props }: CardDisplayProps) {
    const [newCard, setNewCard] = useState(false);

    useEffect(() => {
        setNewCard(true);
        setTimeout(() => {
            setNewCard(false);
        }, 500);
    }, [card]);

    const gray = useToken("colors", "gray.600");
    const green = "#01f702";
    const red = "#ff4400";

    return (
        <AspectRatio ratio={85.6 / 53.98} w="full" {...props}>
            <VStack
                w="full"
                borderWidth={1}
                borderStyle="solid"
                borderColor="gray.600"
                borderRadius={10}
                boxShadow={`0px 0px 50px 0px ${
                    card && newCard ? (card.cardData ? green : red) : gray
                }`}
                transition={newCard ? "none" : "box-shadow 0.2s ease-in-out"}
                color="gray.100"
                p={6}
                spacing={0}
            >
                {card ? (
                    <>
                        <HStack alignSelf="stretch">
                            <Icon fontSize="4xl" as={BiCreditCard} />
                            <Spacer />
                            <Text
                                fontSize="3xl"
                                alignSelf={"end"}
                                color={
                                    card.cardData && card.cardData.balance < 0
                                        ? red
                                        : undefined
                                }
                            >
                                {card.cardData /* Split with space at every 3 characters */ ? (
                                    card.cardData.balance
                                        .toFixed(0)
                                        .replace(/\B(?=(\d{3})+(?!\d))/g, " ") +
                                    " $"
                                ) : (
                                    <>&nbsp;</>
                                )}
                            </Text>
                        </HStack>
                        <Spacer />
                        <Text fontSize="lg" opacity={0.5} alignSelf={"start"}>
                            {
                                /* Display the ID as 0000 0000 0000 0000 */
                                card.id
                                    .toString()
                                    .padStart(16, "0")
                                    .replace(/(.{4})/g, "$1 ")
                                    .trim()
                            }
                        </Text>
                        <Text fontSize="2xl" alignSelf="start">
                            {card.cardData?.holder || <>&nbsp;</>}
                        </Text>
                    </>
                ) : (
                    <>
                        <Text opacity={0.1} fontSize="xl">
                            Přiložte kartu...
                        </Text>
                    </>
                )}
            </VStack>
        </AspectRatio>
    );
}
