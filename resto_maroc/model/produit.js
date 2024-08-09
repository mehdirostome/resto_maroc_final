import connectionPromise from './connexion.js';

export async function getProduits(){
    const connection = await connectionPromise;
    const produits = connection.all('SELECT * FROM produit');
    return produits;
}

export async function getProduit(id_produit){
    const connection = await connectionPromise;
    const produit = connection.all('SELECT * FROM produit WHERE id_produit = ?', [id_produit]);
    return produit;
}