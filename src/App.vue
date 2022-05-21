<template>
  <div id="app" class="min-h-screen backgroundColor">
    <div class="flex flex-wrap justify-center pt-10 px-5">
      <h1 class="text-center text-5xl w-full mb-5 text-white">
        Analysis Of Data
      </h1>

      <div class="w-full sm:w-1/3 md:pr-3">
        <div class="p-5 bg-white border rounded-lg text-black">
          <h2 class="mt-3 text-center text-2xl font-bold">File upload</h2>
          <input
            type="file"
            class="hidden"
            ref="onFileChange"
            @input="handleFileUpload($event)"
          />
          <div class="text-center mt-3" type="file" accept=".csv">
            <h3 class="my-3 text-center text-xl">
              {{ nameFile }}
            </h3>
            <vs-button
              @click="$refs.onFileChange.click()"
              class="m-auto px-3"
              size="large"
            >
              Upload
            </vs-button>
          </div>
        </div>

        <div
          class="p-5 bg-white border rounded-lg text-black mt-5"
          v-if="dataCsv.length > 0"
        >
          <h2 class="my-3 text-center text-2xl font-bold">
            Accounting Summary
          </h2>
          <div class="w-full">
            <DoughnutChart
              :height="275"
              :data="chartData"
              :options="options"
              class="mb-3"
            />
            <div
              v-for="(tr, index) in countData"
              :key="tr.device"
              :class="index < countData.length - 1 ? 'mb-1' : ''"
              class="
                w-full
                flex
                justify-between
                border border-solid
                rounded
                py-1
                px-4
                my-2
              "
            >
              <span>{{ tr.state }}</span>
              <span>{{ tr.value }}</span>
            </div>
          </div>
        </div>
      </div>
      <div
        class="w-full lg:w-1/2 mt-5 lg:mt-0 bg-white border rounded-lg"
        v-if="dataCsv.length > 0"
      >
        <vs-table class="bg-white" ref="tableList">
          <template #header>
            <vs-select placeholder="Limit" v-model="limitTable" class="w-20">
              <vs-option
                v-for="(tr, indexTr) in arrMaxed"
                :key="indexTr"
                :label="tr"
                :value="tr"
                >{{ tr }}</vs-option
              >
            </vs-select>
          </template>
          <template #thead>
            <vs-tr>
              <vs-th> Device </vs-th>
              <vs-th
                sort
                @click="dataCsv = $vs.sortData($event, dataCsv, 'fromts')"
              >
                Start Time
              </vs-th>
              <vs-th
                sort
                @click="dataCsv = $vs.sortData($event, dataCsv, 'tots')"
              >
                End Time
              </vs-th>
              <vs-th
                sort
                @click="dataCsv = $vs.sortData($event, dataCsv, 'avgvalue')"
              >
                avgvalue
              </vs-th>
              <vs-th
                sort
                @click="dataCsv = $vs.sortData($event, dataCsv, 'load')"
              >
                Load
              </vs-th>
              <vs-th> State </vs-th>
            </vs-tr>
          </template>
          <template #tbody>
            <vs-tr
              v-for="(tr, indexTr) in $vs.getPage(dataCsv, page, limitTable)"
              :key="indexTr"
              :data="tr"
            >
              <vs-td checkbox>
                {{ tr.deviceid }}
              </vs-td>
              <vs-td class="whitespace-nowrap">
                {{ tr.fromts }}
              </vs-td>
              <vs-td class="whitespace-nowrap">
                {{ tr.tots }}
              </vs-td>
              <vs-td class="whitespace-nowrap">
                {{ tr.avgvalue | formatDecimal }}
              </vs-td>
              <vs-td class="whitespace-nowrap">
                {{ tr.load | formatDecimal }} %
              </vs-td>
              <vs-td>
                <span class="whitespace-nowrap" :class="tr.state.color">{{
                  tr.state.text
                }}</span>
              </vs-td>
            </vs-tr>
          </template>
          <template #footer>
            <vs-pagination
              v-model="page"
              :length="$vs.getLength($vs.getSearch(dataCsv), limitTable)"
            />
          </template>
        </vs-table>
      </div>
    </div>
  </div>
</template>

 <script>
import Papa from "papaparse";
import DoughnutChart from "./component/DoughnutChart.vue";

export default {
  components: {
    DoughnutChart,
  },
  filters: {
    formatDecimal(value) {
      if (value) {
        return value.toFixed(2);
      }
    },
  },
  data: () => ({
    dataCsv: [],
    countData: [
      {
        state: "On - unloaded",
        value: 0,
      },
      {
        state: "On - idle",
        value: 0,
      },
      {
        state: "On - loaded",
        value: 0,
      },
      {
        state: "Off",
        value: 0,
      },
    ],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateRotate: true,
      },
      legend: { display: false },
    },
    page: 1,
    limitTable: 15,
    arrMaxed: [15, 25, 50, 100],
    nameFile: "",
  }),
  computed: {
    chartData() {
      return {
        labels: ["On - unloaded", "On - idle", "On - loaded", "Off"],
        datasets: [
          {
            backgroundColor: ["#FF6384", "#FFCE56", "#00BF30", "c4c4c4"],
            data: [
              this.countData[0].value,
              this.countData[1].value,
              this.countData[2].value,
              this.countData[3].value,
            ],
          },
        ],
      };
    },
  },
  methods: {
    handleFileUpload(e) {
      if (!e.target.files[0]) {
        return;
      }
      const loading = this.$vs.loading({ text: "Loading..." });
      const file = e.target.files[0];
      this.nameFile = file.name;

      const complete = (resultCsv) => {
        const data = resultCsv.data.map((item) => {
          return {
            deviceid: item.deviceid,
            fromts: this.formatDate(item.fromts),
            tots: this.formatDate(item.tots),
            avgvalue: this.avgvalue(item),
          };
        });
        const avgValueMax = this.calculateAvgMax(data);
        data.forEach((item) => {
          const load = (item.avgvalue * 100) / avgValueMax;
          item.load = load;
          item.state = this.showStateLoad(load);
        });

        data.sort((a, b) => {
          return b.fromts - a.fromts;
        });
        this.dataCsv = data;
        loading.close();
      };
      Papa.parse(file, {
        header: true,
        complete,
      });
    },
    avgvalue(item) {
      const metrics = item.metrics;
      if (metrics) {
        return JSON.parse(metrics).Psum?.avgvalue || 0;
      } else {
        return 0;
      }
    },
    calculateAvgMax(avgvalue) {
      const avgValueMaxArr = avgvalue.map((item) => {
        return item.avgvalue;
      });
      return Math.max(...avgValueMaxArr);
    },
    showStateLoad(load) {
      if (load > 0 && load <= 5) {
        this.countData[0].value++;
        return {
          text: "On - unloaded",
          color: "text-red-500",
        };
      } else if (load > 5 && load <= 20) {
        this.countData[1].value++;
        return {
          text: "On - idle",
          color: "text-yellow-700",
        };
      } else if (load > 20) {
        this.countData[2].value++;
        return {
          text: "On - loaded",
          color: "text-green-500",
        };
      } else {
        this.countData[3].value++;
        return {
          text: "Off",
          color: "text-gray-500",
        };
      }
    },
    formatDate(unix_timestamp) {
      const date = new Date(parseInt(unix_timestamp));
      if(typeof(unix_timestamp) !== 'undefined'){   
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const hours = date.getHours();
        const minutes = "0" + date.getMinutes();
        const formattedTime = hours + ":" + minutes.substr(-2);
        return day + "/" + month + "/" + year + " " + formattedTime;
      } else {
        return "";
      }
    }
  },
};
</script>

