<script setup>
// « Ma fiche » : les mêmes trois onglets que la fiche joueur côté staff.
import { useRoute, useRouter } from "vue-router";
import TabBar from "../../components/TabBar.vue";
import { PLAYER_TABS, useTabQuery } from "../../lib/playerTabs.js";
import PlayerProfileView from "./PlayerProfileView.vue";
import PlayerEvaluationView from "./PlayerEvaluationView.vue";
import PlayerFollowUpView from "./PlayerFollowUpView.vue";
import PlayerCompetitionView from "./PlayerCompetitionView.vue";

const activeTab = useTabQuery(useRoute(), useRouter());
</script>

<template>
  <div>
    <TabBar v-model="activeTab" :tabs="PLAYER_TABS" aria-label="Volets de ma fiche" />
    <div v-show="activeTab === 'fiche'" role="tabpanel"><PlayerProfileView /></div>
    <div v-show="activeTab === 'evaluations'" role="tabpanel" class="space-y-4">
      <PlayerEvaluationView />
      <PlayerFollowUpView />
    </div>
    <div v-show="activeTab === 'resultats'" role="tabpanel"><PlayerCompetitionView /></div>
  </div>
</template>
