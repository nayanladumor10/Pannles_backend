const express = require("express")
const router = express.Router()
const {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
} = require("../controllers/invoiceController")

// Routes
router.route("/").get(getInvoices).post(createInvoice)
router.route("/stats").get(getInvoiceStats)
router.route("/:id").get(getInvoice).put(updateInvoice).delete(deleteInvoice)

module.exports = router