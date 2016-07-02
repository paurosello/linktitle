import frappe
from frappe.utils import cstr, unique

@frappe.whitelist()
def title_field(doctype, name):
	meta = frappe.get_meta(doctype)
	if meta.title_field:
		return frappe.db.get_value(doctype, name, meta.title_field or 'name')
	else:
		return name