const admin = require("firebase-admin");

const serviceAccount = {
  projectId: "crispydosa-app",
  // We can just initialize without credentials if we have default application credentials,
  // but since we don't, we can use the REST API via fetch, which is much simpler!
};
