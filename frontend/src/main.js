import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";
import App from "./App.vue";
import router from "./router/index.js";
import "primevue/resources/themes/lara-light-blue/theme.css";
import "primevue/resources/primevue.min.css";
import "primeicons/primeicons.css";
import "./assets/main.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
// Calendriers en français (noms des mois et des jours, semaine commençant le lundi).
// On complète la locale par défaut sans la remplacer (libellés des autres composants).
app.use(PrimeVue);
Object.assign(app.config.globalProperties.$primevue.config.locale, {
  firstDayOfWeek: 1,
  dayNames: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
  dayNamesShort: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
  dayNamesMin: ["D", "L", "M", "M", "J", "V", "S"],
  monthNames: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  monthNamesShort: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  today: "Aujourd'hui",
  clear: "Effacer",
  weekHeader: "Sem.",
  dateFormat: "dd/mm/yy",
});
app.use(ToastService);
app.use(ConfirmationService);

app.mount("#app");
