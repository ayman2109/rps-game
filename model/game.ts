import { Models } from "appwrite";
import { Mode } from "fs";

export interface GameInterface extends Models.Document {
    gameId: string,
    player1: string,
    player2?: string
    move1: string[],
    move2: string[]
}