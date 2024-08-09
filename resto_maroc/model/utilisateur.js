import connectionPromise from "./connexion.js";
import bcrypt from 'bcrypt'

export async function addUtilisateur(courriel,motDePasse){
    const connection = await connectionPromise;
    let hash= await bcrypt.hash(motDePasse,10);

    await connection.run(
        `INSERT INTO utilisateur(courriel, mot_de_passe, id_type_utilisateur) VALUES (?, ?, 1)`,
        [courriel, hash]
    );
}

export async function getUtilisateurParID(id_utilisateur){
const connection=await connectionPromise;
let utilisateur = await connection.get(
    'SELECT * FROM utilisateur WHERE id_utilisateur = ? ',
    [id_utilisateur]
);
return addUtilisateur;
}
export async function getUtilisateurParcourriel(courriel){
    let connection = await connectionPromise;

    const result = await connection.get(
        `SELECT id_utilisateur, courriel, mot_de_passe, id_type_utilisateur 
        FROM utilisateur
        WHERE courriel = ?`,
        [courriel]
    );

    return result;
}