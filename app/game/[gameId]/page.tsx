
'use client';



import { useEffect, useRef, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { ID } from "appwrite";
import { client, databases, databaseId, collectionId } from "@/app/appwrite";
import { GameInterface } from "@/model/game";
import { RealtimeResponseEvent } from "appwrite";
import { FaCheckCircle } from "react-icons/fa";
import { FaEquals } from "react-icons/fa6";
import { FaRegTimesCircle } from "react-icons/fa";

export default function Game() {
    const [started, setStarted] = useState(false);
    const [boss, setBoss] = useState<string | null>(null);
    const params = useParams<{ gameId: string }>();
    const channel = `databases.${databaseId}.collections.${collectionId}.documents.${params.gameId}`;

    useEffect(() => {
    
        const playerId = localStorage.getItem("rps-player-id") || ID.unique();
        localStorage.setItem("rps-player-id", playerId);

        const fetchGame = async () => {
            try {
                const game = await databases.getDocument<GameInterface>(databaseId, collectionId, params.gameId);
                setBoss(game.player1);
                setStarted(!!game.player2);
            } catch (error) {
                console.error("Error fetching game:", error);
            }
        };

        fetchGame();

        const unsubscribe = client.subscribe(channel, (response: RealtimeResponseEvent<GameInterface>) => {
            if (response.payload.player2 && !started) setStarted(true);
        });


        return () => unsubscribe();
    }, [params.gameId, started]);

    if (!boss) return <h1 className="text-center"></h1>;

    const isBoss = boss === localStorage.getItem("rps-player-id");

    return started ? <GameBoard /> : isBoss ? <Loader /> : <JoinGame />;
}

function GameBoard() {
    const [choices, setChoices] = useState<string[]>([]);
    const [opponentChoices, setOpponentChoices] = useState<string[]>([]);
    const params = useParams<{ gameId: string }>();
    const channel = `databases.${databaseId}.collections.${collectionId}.documents.${params.gameId}`;
    const [winner, setWinner] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const result = useRef<Array<number>>([])


    const calWinner = (move1: string, move2: string) => {
        if (move1 == move2) return 0;
        if (
            (move1 == "rock" && move2 == "scissor") ||
            (move1 == "scissor" && move2 == "paper") ||
            (move1 == "paper" && move2 == "rock")
        ) {
            return 1
        } else {
            return 2
        }
    }


    const updateChoices = (doc: GameInterface) => {
        const isPlayer1 = doc.player1 === localStorage.getItem("rps-player-id");
        setChoices(isPlayer1 ? doc.move1 : doc.move2);
        setOpponentChoices(isPlayer1 ? doc.move2 : doc.move1);


        if (doc.move1.length === 0 && doc.move2.length === 0) {
            result.current = []
            setWinner('');
        }
        if (doc.move1.length == 3 && doc.move2.length == 3) {
            for (let i = 0; i < 3; i++) {
                if (doc.player1 == localStorage.getItem('rps-player-id')) {
                    result.current.push(calWinner(doc.move1[i], doc.move2[i]))
                } else {
                    result.current.push(calWinner(doc.move2[i], doc.move1[i]))
                }
            }
            const a = result.current.filter(x => x == 1).length
            const b = result.current.filter(x => x == 2).length
            if (a > b) {
                setWinner("You Win")
            } else if (a == b) {
                setWinner("Its A draw")
            } else {
                setWinner("You Loose")
            }

        }


    };

    const playAgain = async () => {
        setWinner('')
        setOpponentChoices([])
        setChoices([])
        result.current = []
        await databases.updateDocument(databaseId, collectionId, params.gameId, {
            ["move1"]: [], ["move2"]: []
        });
    }

    useEffect(() => {
        const fetchGame = async () => {
            setIsLoading(true)
            try {
                const doc = await databases.getDocument<GameInterface>(databaseId, collectionId, params.gameId);
                updateChoices(doc);
                setIsLoading(false)
            } catch (error) {
                console.error("Error fetching game board:", error);
            }
        };

        fetchGame();

        const unsubscribe = client.subscribe(channel, (response: RealtimeResponseEvent<GameInterface>) => {
                
                updateChoices(response.payload)
           
        }
        );

        return () => unsubscribe();
    }, [params.gameId]);

    const makeAttempt = async (choice: string) => {
        
        try {
    
            const doc = await databases.getDocument<GameInterface>(databaseId, collectionId, params.gameId);
            const isPlayer1 = localStorage.getItem("rps-player-id") === doc.player1;

            const movesKey = isPlayer1 ? "move1" : "move2";
            const moves = doc[movesKey];
            if (moves.length == 3) {
                console.log('enough')
                return
            };

            setChoices([...choices, choice])

            await databases.updateDocument(databaseId, collectionId, params.gameId, {
                [movesKey]: [...moves, choice],
            });
        } catch (error) {
            console.error("Error updating move:", error);
            

        }
    };

    if(isLoading) return <h1 className="my-8 text-center">Loading ... </h1>
    // "rock" ? "" : "paper" ? "" : ""
    return (
        <div className="my-48">
            <h1 className="text-center">Select Your Move</h1>
            <div className="flex justify-center items-center space-x-24 my-9">
                {["rock", "paper", "scissor"].map((choice) => (
                    <button
                        disabled={choices.length == 3}
                        key={choice}
                        onClick={() => makeAttempt(choice)}
                        className="text-5xl transform transition-transform duration-200 hover:scale-125"
                    >
                        {choice === "rock" ? "🪨" : choice === "paper" ? "📃" : "✂️"}
                    </button>
                ))}
            </div>
            <h1 className="text-center text-purple-950 my-6 text-4xl">{winner}</h1>
            <div className="flex justify-center items-center">
                <table className="table-auto border-collapse border border-gray-300 bg-white shadow-lg">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-gray-300 px-4 py-2">You</th>
                            <th className="border border-gray-300 px-4 py-2">2nd Player</th>
                            <th className="border border-gray-300 px-4 py-2">Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array(3)
                            .fill(null)
                            .map((_, i) => (
                                <tr key={`${i}x`}>
                                    <td className="border border-gray-300 px-4 py-2 text-center w-32 h-14 ">
                                        {winner ? (choices[i] === "rock" ? "🪨" : choices[i] === "paper" ? "📃" : "✂️") : <FaCheckCircle className={choices && choices[i] ? 'text-green-700' : ''} />}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center w-32 h-14">
                                        {winner ? (opponentChoices[i] === "rock" ? "🪨" : opponentChoices[i] === "paper" ? "📃" : "✂️") : <FaCheckCircle className={opponentChoices && opponentChoices[i] ? 'text-green-700' : ''} />}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center w-32 h-14">
                                        {winner ? (result.current[i] == 0 ? <FaEquals /> : result.current[i] == 1 ? <FaCheckCircle className="text-green-700" /> : <FaRegTimesCircle className="text-red-600" /> ) : '-'}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
                
            </div>
            <div className="flex justify-center  m-5">
                
                <span>|'_'|</span>
               
            </div>
            {winner && (
                <div className="flex justify-center items-center">
                    <button onClick={playAgain} className="my-14 p-2 rounded-lg border-solid border-2 border-gray-800">Play Again</button>
                </div>)
            }
        </div>
    );
}


function Loader() {
    const [copied, setCopied] = useState(false);

    // Function to copy the current URL to clipboard
    const copyToClipboard = () => {
        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000); // Reset the copied state after 2 seconds
            })
            .catch((err) => console.error("Failed to copy URL:", err));
    };

    return (
        <div className='m-10'>
            <div className="flex flex-col items-center space-y-4">  {/* Updated flex to flex-col for vertical stacking */}
                <button
                    disabled
                    type="button"
                    className="py-2.5 px-5 text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-gray-900 focus:z-10 focus:ring-2 focus:ring-gray-700 focus:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 inline-flex items-center"
                >
                    <svg
                        aria-hidden="true"
                        role="status"
                        className="inline w-4 h-4 me-3 text-gray-200 animate-spin dark:text-gray-600"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="currentColor"
                        />
                        <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="#383942"
                        />
                    </svg>
                    Waiting for 2nd Player
                </button>

                {/* Copy URL Button */}
                <button
                    type="button"
                    onClick={copyToClipboard}
                    className="py-2 px-4 text-sm font-medium text-white bg-gray-700 rounded-lg border border-gray-600 hover:bg-gray-600 focus:ring-gray-300  dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:focus:ring-blue-700 inline-flex items-center"
                >
                    {copied ? (
                        <span className="text-white">URL Copied!</span>
                    ) : (
                        <span className="text-lg">Share this URL with 2nd Player</span>
                    )}
                </button>
            </div>
        </div>

    );
}


function JoinGame(): React.ReactNode {
    const params = useParams<{ gameId: string }>();

    async function handleClick({ gameId }: { gameId: string }) {
        try {
            await databases.updateDocument(
                '6742bfb200275714f0e1', // Database ID
                '6742bfd300184d839e5f', // Collection ID
                gameId,                // Document ID
                { player2: localStorage.getItem('rps-player-id') }
            );

        } catch (error) {
            console.error("Error joining the game:", error);

        }
    }

    return (
        <div className="flex flex-col items-center space-y-4 m-10">
            <h2>😝 Rock Paper Scissors 😝</h2>
            <button
                type="button"
                className="text-white text-lg bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-full  px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
                onClick={() => handleClick({ gameId: params.gameId! })}
            >
                Join Game
            </button>
        </div>
    );
}
