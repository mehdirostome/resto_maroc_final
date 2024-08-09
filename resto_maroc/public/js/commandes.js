
async function onUpdateCommandeState(event) {
    // recuperer les données de la commande
    const id_commande = parseInt(event.target.dataset.idCommande);
    const select = document.getElementById(`etat-command-${id_commande}`);
    const id_etat_commande = parseInt(select.value);
    // preparer la requete
    let url = `/api/commandes/${id_commande}`;
    method = 'PATCH';
    let bodyData = {
        id_etat_commande: id_etat_commande
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
    }else{
        const data = await response.json();
        alert("Erreur: " + data.message);
    }
}

function AjoutCommandeUI(commande, etatsCommande) {
    /*

        <li class="commande">
        <div class="commande-info">
            <div class="commande-id">Commande #{{this.id_commande}}</div>
            <div class="commande-date">{{this.date}}</div>
            <!-- display input combobox state -->
            <div class="commande-state">{{this.etat_commande.nom}}</div>
            <div>
                <select name="etat-command-{{this.id_commande}}" id="etat-command-{{this.id_commande}}">
                    {{#each ../etatsCommande}}
                    <option value="{{this.id_etat_commande}}" 
                    {{#if (ifeq this.id_etat_commande ../this.etat_commande.id_etat_commande)}}selected="selected"{{/if}} >
                    {{this.nom}}
                    </option>

                    {{/each}}
                </select>
            </div>
            <div>
                <button class="btn-modifier-etat" data-id-commande="{{this.id_commande}}" >
                    Modifier</button>
            </div>
        </div>

    </li>

     */
    const liCommande = document.createElement('li');
    liCommande.classList.add('commande');
    const divCommandeInfo = document.createElement('div');
    divCommandeInfo.classList.add('commande-info');
    const divCommandeId = document.createElement('div');
    divCommandeId.classList.add('commande-id');
    divCommandeId.textContent = `Commande #${commande.id_commande}`;
    const divCommandeDate = document.createElement('div');
    divCommandeDate.classList.add('commande-date');
    divCommandeDate.textContent = commande.date;
    const divCommandeState = document.createElement('div');
    divCommandeState.classList.add('commande-state');
    const etatCommande = etatsCommande.find((etat) => etat.id_etat_commande === commande.id_etat_commande);
    divCommandeState.textContent = "En "+etatCommande.nom[0].toUpperCase() + etatCommande.nom.slice(1);
    const divSelect = document.createElement('div');
    const select = document.createElement('select');
    select.name = `etat-command-${commande.id_commande}`;
    select.id = `etat-command-${commande.id_commande}`;
    etatsCommande.forEach(function (etat) {
        const option = document.createElement('option');
        option.value = etat.id_etat_commande;
        if (etat.id_etat_commande === etatCommande.id_etat_commande) {
            option.selected = 'selected';
        }
        option.textContent = "En " + etat.nom[0].toUpperCase() + etat.nom.slice(1);
        select.appendChild(option);
    }
    );
    select.value = etatCommande.id_etat_commande;
    const divBtn = document.createElement('div');
    const btn = document.createElement('button');
    btn.classList.add('btn-modifier-etat');
    btn.dataset.idCommande = commande.id_commande;
    btn.textContent = 'Modifier';
    btn.addEventListener('click', onUpdateCommandeState);
    divBtn.appendChild(btn);
    divSelect.appendChild(select);
    divCommandeInfo.appendChild(divCommandeId);
    divCommandeInfo.appendChild(divCommandeDate);
    divCommandeInfo.appendChild(divCommandeState);
    divCommandeInfo.appendChild(divSelect);
    divCommandeInfo.appendChild(divBtn);
    liCommande.appendChild(divCommandeInfo);
    const ulCommandes = document.getElementById('commandeList');
    ulCommandes.appendChild(liCommande);
}

function MiseAJourCommandeUI(commande, etatCommande) {
    const selectCommandeState = document.getElementById(`etat-command-${commande.id_commande}`);
    const divCommandeState = selectCommandeState.parentElement.previousElementSibling;
    divCommandeState.textContent = "En "+etatCommande.nom[0].toUpperCase() + etatCommande.nom.slice(1);
    // select value to etatCommande.id_etat_commande
    selectCommandeState.value = commande.id_etat_commande;

}

function onNovelleCommande(event) {
    const data = JSON.parse(event.data);
    AjoutCommandeUI(data.commande, data.etatCommande);
}

function onCommandModifier(event) {
    const data = JSON.parse(event.data);
    MiseAJourCommandeUI(data.commande, data.etatCommande);
}




// on attend que le DOM soit chargé pour ajouter les écouteurs d'événements
window.addEventListener('load', function () {
    const btns = document.querySelectorAll('.btn-modifier-etat');
    btns.forEach(function (btn) {
        btn.addEventListener('click', onUpdateCommandeState);
    });

    let eventSource = new EventSource('/api/stream');
    eventSource.addEventListener('nouvelleCommande', onNovelleCommande);
    eventSource.addEventListener('commandeModifiee', onCommandModifier);;
});