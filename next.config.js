const path = require("path");

const nextConfig = {
   experimental:{
    serverActions:true,
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  }
 
};

module.exports = nextConfig;