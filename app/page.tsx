'use client'
import { ID } from 'appwrite';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { databases } from './appwrite';

export default function Home() {
  const router = useRouter();
  const [load, setLoad] = useState<boolean>(false)
  useEffect(() => {
    // Ensure that player ID is stored in localStorage if it doesn't exist
    if (!localStorage.getItem('rps-player-id')) {
      localStorage.setItem('rps-player-id', ID.unique());
    }
  }, []);

  const createNewGame = async () => {
    setLoad(true)
    try {
      const newGameId = ID.unique(); // Generate a new game ID
      const player1 = localStorage.getItem('rps-player-id'); // Get the player's ID from localStorage

      // Create a new game document in the database
      await databases.createDocument(
        '6742bfb200275714f0e1', // Database ID
        '6742bfd300184d839e5f', // Collection ID
        newGameId,               // Document ID
        { gameId: newGameId, player1}
      );

      // Navigate to the new game's page after the document is created
      router.push(`/game/${newGameId}`);
    } catch (error) {
      console.error("Error creating new game:", error);
    } finally {
      setLoad(false)
    }
  };

  return (
    <div className='py-10 m-24 text-center'>
      <h1 className='text-orange-300 text-9xl my-11'>Rock Paper Scissors</h1>
      <button className='text-white rounded-md bg-slate-600 py-6 px-9 text-2xl'onClick={createNewGame}>
        {load ? 'Starting new game ..... ': 'Start a New Game'}
      </button>
    </div>
  );
}
