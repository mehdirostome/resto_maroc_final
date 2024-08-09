export function validateId(id){
    return !isNaN(id) && id > 0 && id != undefined && id != null && typeof id == "number";
}

export function validateQuantite(quantite){
    return !isNaN(quantite) && quantite > 0 && quantite != undefined && quantite != null && typeof quantite == "number";;
}
export const iscourrielValid = (courriel)=>{
    return typeof courriel ==='string'&&
    courriel.length>=8;
}

export const ismotDePasseValid = (motDePasse)=>{
    return typeof motDePasse ==='string' &&
    motDePasse.length>=8;
}