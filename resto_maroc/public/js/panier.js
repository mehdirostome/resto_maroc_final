async function onUpdatePanier(event) {
    const id_produit = parseInt(event.target.dataset.idProduit);
    const quantite = parseInt(event.target.dataset.produitQuantite);
    let url = `/api/panierProduit/${id_produit}`;
     method = 'PATCH';
    let bodyData = {
        quantite: quantite
    }

    const body = JSON.stringify(bodyData);
    const headers = {
        'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    const response = await fetch(url, {method, body, headers});
    if(response.ok){
        window.location.reload();
    }else{
        const data = await response.json();
        alert("Erreur: " + data.message);
    }
}



async function onDeletePanier(event) {
    const id_produit = parseInt(event.target.dataset.idProduit);
    let url = `/api/panierProduit`;
     method = 'DELETE';
    let bodyData = {
        id_produit: id_produit
    }

    const body = JSON.stringify(bodyData);
    const headers = {
        'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    const response = await fetch(url, {method, body, headers});
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

async function onViderPanier(event) {
    let url = `/api/panier`;
     method = 'DELETE';
    const headers = {
        'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    const response = await fetch(url, {method, headers});
    if(response.ok){
        alert("Panier vidé.");
        window.location.reload();
    }else{
        const data = await response.json();
        alert("Erreur: " + data.message);
    }
}

async function onSoumettrePanier(event) {
    let url = `/api/soummettrePanier`;
     method = 'GET';
    const headers = {
        'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    const response = await fetch(url, {method, headers});
    if(response.ok){
        // si la soumission du panier est reussi, on redirige vers la page menu
        alert("Soumission du panier reussi.");
        window.location.href = "/menu";
    }else{
        const data = await response.json();
        alert("Erreur: " + data.message);
    }
}

// on attend que le DOM soit chargé pour ajouter les écouteurs d'événements
window.addEventListener('load', function () {
    const btns_modifier = document.querySelectorAll('.btn-produit-modifier');
    btns_modifier.forEach(btn => btn.addEventListener('click', onUpdatePanier));
    const btns_supprimer = document.querySelectorAll('.btn-produit-supprimer');
    btns_supprimer.forEach(btn => btn.addEventListener('click', onDeletePanier));
    const btnsIncrement = document.querySelectorAll('.btn-increment');
    btnsIncrement.forEach(btn => btn.addEventListener('click', onIncrementProduitQuantite));
    const btnsDecrement = document.querySelectorAll('.btn-decrement');
    btnsDecrement.forEach(btn => btn.addEventListener('click', onDecrementProduitQuantite));
    const btnViderPanier = document.getElementById('btn-vider-panier');
    btnViderPanier.addEventListener('click', onViderPanier);
    const btnSoumettrePanier = document.getElementById('btn-soumettre-panier');
    btnSoumettrePanier.addEventListener('click', onSoumettrePanier);
});
