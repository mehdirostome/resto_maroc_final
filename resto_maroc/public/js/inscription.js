
let inputEmail = document.getElementById('inputEmail');
let inputMotDePasse = document.getElementById('input-mot-de-passe');
let formulaire = document.getElementById('formulaire');
const errorMessage = document.getElementById('message-erreur');


formulaire.addEventListener('submit', async (event) => {
    event.preventDefault();

    if(!validaterDonnees()){
        return;
    }

    // Les noms des variables doivent être les mêmes
    // que celles spécifié dans les configuration de
    // passport dans le fichier "authentification.js"
    const data = {
        courriel: inputEmail.value,
        motDePasse: inputMotDePasse.value
    };

    let response = await fetch('/api/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        // Si l'authentification est réussi, on
        // redirige vers une autre page
        window.location.replace('/connexion');
    }
    else if(response.status === 409) {
        // Si l'authentification ne réussi pas, on
        // a le message d'erreur dans l'objet "data"
        errorMessage.textContent = "courriel déjà pris";
        errorMessage.hidden = false;
    }
});


const validaterDonnees = () => {
    // cacher le message d'erreur
    errorMessage.hidden = true;
    if(inputEmail.validity.typeMismatch || inputEmail.validity.valueMissing){
        errorMessage.textContent = "Le courriel est Erroner";
        errorMessage.hidden = false;
        return false;
    }

    if(inputMotDePasse.validity.tooShort){
        errorMessage.textContent = "Mot de passe est trop court";
        errorMessage.hidden = false;
        return false;
    }
    
    return true;
}




