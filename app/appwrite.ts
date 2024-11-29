import { Client, Databases } from "appwrite";



const client = new Client();
client.setEndpoint('https://cloud.appwrite.io/v1').setProject('6742aee5001f53f42677');


const databases = new Databases(client);
const databaseId = '6742bfb200275714f0e1'
const collectionId = '6742bfd300184d839e5f'

export {client, databases, databaseId, collectionId};