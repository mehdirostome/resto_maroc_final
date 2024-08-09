import connectionPromise from './connexion.js';

// get commande
export async function getCommande(id_commande){
    const connection = await connectionPromise;
    const commande = await connection.get('SELECT * FROM commande WHERE id_commande = ?', [id_commande]);
    return commande;
}

// get commande
export async function getCommandeSoumise(id_commande){
    const connection = await connectionPromise;
    const commande = await connection.get('SELECT * FROM commande WHERE id_commande = ? and id_etat_commande != ?', [id_commande, 1]);
    return commande;
}

export async function getUtilisateurPanier(id_utilisateur){
    const connection = await connectionPromise;
    const panier = await connection.get('SELECT * FROM commande WHERE id_utilisateur = ? and id_etat_commande = ?', [id_utilisateur, 1]);
    return panier;
}

export async function creerPanier(id_utilisateur){
    const connection = await connectionPromise;
    const result = await connection.run('INSERT INTO commande(id_utilisateur, id_etat_commande, date) VALUES(?, ?, ?)', [id_utilisateur, 1, Date.now()]);
    const panier = await getUtilisateurPanier(id_utilisateur);
    return panier;
}


export async function getProduitPanier(id_panier){
    // get les produits du panier
    const connection = await connectionPromise;
    const panier_produits = await connection.all('SELECT * FROM commande_produit WHERE id_commande = ?', [id_panier]);
    if(panier_produits.length === 0){
        return {
            panier_produits: [],
            produits: []
        };
    }
    // get les informations des produits qui sont dans le panier
    const produits = await connection.all('SELECT * FROM produit WHERE id_produit IN (SELECT id_produit FROM commande_produit WHERE id_commande = ?)', [id_panier]);
    return {
        panier_produits,
        produits
    };
}

export async function ajouterProduitCommand(id_panier, id_produit, quantite){
    const connection = await connectionPromise;
    await connection.run('INSERT INTO commande_produit(id_commande, id_produit, quantite) VALUES(?, ?, ?)', [id_panier, id_produit, quantite]);
}

export async function soumettrePanier(id_panier){
    const connection = await connectionPromise;
    await connection.run('UPDATE commande SET id_etat_commande = ?, date = ? WHERE id_commande = ?', [2, Date.now(), id_panier]);

}

export async function supprimerProduitPanier(id_panier, id_produit){
    const connection = await connectionPromise;
    await connection.run('DELETE FROM commande_produit WHERE id_commande = ? AND id_produit = ?', [id_panier, id_produit]);
}

export async function modifierQuantiteProduitPanier(id_panier, id_produit, quantite){
    const connection = await connectionPromise;
    await connection.run('UPDATE commande_produit SET quantite = ? WHERE id_commande = ? AND id_produit = ?', [quantite, id_panier, id_produit]);
}

export async function supprimerPanier(id_panier){
    const connection = await connectionPromise;
    await connection.run('DELETE FROM commande_produit WHERE id_commande = ?', [id_panier]);
    await connection.run('DELETE FROM commande WHERE id_commande = ?', [id_panier]);
}

// get les commandes soumises
export async function getCommandesSoumises(){
    const connection = await connectionPromise;
    const commandes = await connection.all('SELECT * FROM commande WHERE id_etat_commande != ?', [1]);
    return commandes;
}

// modifier etat commande
export async function modifierEtatCommande(id_commande, id_etat_commande){
    const connection = await connectionPromise;
    await connection.run('UPDATE commande SET id_etat_commande = ? WHERE id_commande = ?', [id_etat_commande, id_commande]);
}