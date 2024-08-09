async function onAddProduitToPanier(event) {
    // recuperer les données du produit
    const id_produit = parseInt(event.target.dataset.idProduit);
    const quantite = parseInt(event.target.dataset.produitQuantite);
    // verifier la quantité
    if(quantite <= 0){
        alert("La quantité doit être supérieure à 0.");
        return;
    }
    const isInPanier = event.target.dataset.isInPanier === 'true';
    // preparer la requete
    let url = '/api/panierProduit';
     method = isInPanier ? 'PATCH' : 'POST';
    let bodyData = {
        quantite: quantite
    }
    
    if(isInPanier){
    // si le produit est déjà dans le panier, on ajoute l'id du produit dans l'url
        url += `/${id_produit}`;
    }else {
    // si le produit n'est pas dans le panier, on ajoute l'id du produit dans le body
        bodyData.id_produit = id_produit;
    }
    const body = JSON.stringify(bodyData);
    const headers = {
        'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    // envoyer la requete
    const response = await fetch(url, {method, body, headers});
    // traiter la reponse
    if(response.ok){
        window.location.reload();
    }else{
        const data = await response.json();
        alert("Erreur: " + data.message);
    }
}
function onIncrementProduitQuantite(event) {
    const span = document.getElementById(`span-quantite-${event.target.dataset.idProduit}`);
    const btn = document.getElementById(`btn-add-panier-${event.target.dataset.idProduit}`);
    // on incremente la quantite
    let value = parseInt(span.textContent) + 1;
    //on met à jour le dataset du bouton et le textContent du span
    btn.dataset.produitQuantite = value;
    span.textContent = value;
}

function onDecrementProduitQuantite(event) {
    const span = document.getElementById(`span-quantite-${event.target.dataset.idProduit}`);
    const btn = document.getElementById(`btn-add-panier-${event.target.dataset.idProduit}`);
    // on decremente la quantite
    let value = parseInt(span.textContent) - 1;
    if(value <= 0){
        return;
    }
    //on met à jour le dataset du bouton et le textContent du span
    btn.dataset.produitQuantite = value;
    span.textContent = value
}

// on attend que le DOM soit chargé pour ajouter les écouteurs d'événements
window.addEventListener('load', function () {
    const btns_ajouter = document.querySelectorAll('.btn-produit-ajouter');
    btns_ajouter.forEach(btn => btn.addEventListener('click', onAddProduitToPanier));
    const btnsIncrement = document.querySelectorAll('.btn-increment');
    btnsIncrement.forEach(btn => btn.addEventListener('click', onIncrementProduitQuantite));
    const btnsDecrement = document.querySelectorAll('.btn-decrement');
    btnsDecrement.forEach(btn => btn.addEventListener('click', onDecrementProduitQuantite));

});
