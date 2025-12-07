require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const CWA_API_BASE_URL = "https://opendata.cwa.gov.tw/api";
const CWA_API_KEY = process.env.CWA_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * 取得所有城市的天氣資料
 */
const getAllCitiesWeather = async (req, res) => {
  try {
    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: "伺服器設定錯誤",
        message: "請在 .env 設定 CWA_API_KEY",
      });
    }

    // 取得所有城市
    const response = await axios.get(`${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`, {
      params: {
        Authorization: CWA_API_KEY,
      },
    });

    const locations = response.data.records.location;
    if (!locations || locations.length === 0) {
      return res.status(404).json({ error: "查無資料" });
    }

    // 整理每個城市的天氣
    const citiesWeather = locations.map((loc) => {
      const weatherData = {
        city: loc.locationName,
        forecasts: [],
      };

      const elements = loc.weatherElement;
      const timeCount = elements[0].time.length;

      for (let i = 0; i < timeCount; i++) {
        const forecast = {
          startTime: elements[0].time[i].startTime,
          endTime: elements[0].time[i].endTime,
          weather: "",
          rain: "",
          minTemp: "",
          maxTemp: "",
          comfort: "",
          windSpeed: "",
        };

        elements.forEach((el) => {
          const val = el.time[i].parameter;

          switch (el.elementName) {
            case "Wx":
              forecast.weather = val.parameterName;
              break;
            case "PoP":
              forecast.rain = val.parameterName + "%";
              break;
            case "MinT":
              forecast.minTemp = val.parameterName + "°C";
              break;
            case "MaxT":
              forecast.maxTemp = val.parameterName + "°C";
              break;
            case "CI":
              forecast.comfort = val.parameterName;
              break;
            case "WS":
              forecast.windSpeed = val.parameterName;
              break;
          }
        });

        weatherData.forecasts.push(forecast);
      }

      return weatherData;
    });

    res.json({ success: true, data: citiesWeather });
  } catch (error) {
    console.error("取得天氣資料失敗:", error.message);
    res.status(500).json({
      error: "伺服器錯誤",
      message: "無法取得天氣資料，請稍後再試",
    });
  }
};

app.get("/api/weather", getAllCitiesWeather);

app.get("/api/health", (req, res) => res.json({ status: "OK", timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`🚀 伺服器運行中，PORT=${PORT}`);
});
