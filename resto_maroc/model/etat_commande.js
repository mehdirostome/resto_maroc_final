import connectionPromise from "./connexion.js";

export async function getEtatCommandes() {
    const connection = await connectionPromise;
    const etat_commandes = await connection.all('SELECT * FROM etat_commande');
    return etat_commandes;
}