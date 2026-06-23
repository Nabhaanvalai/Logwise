# LogWise - Product Requirements Document (PRD)

## Product Name

**LogWise**

**Tagline:** Every Entry. Organized.

---

# 1. Product Overview

LogWise is an offline-first desktop application designed to replace physical notebooks and manual ledgers used by contractors, construction businesses, equipment rental operators, and small business owners.

The application allows users to quickly enter transactions in a spreadsheet-like interface and automatically stores them in a centralized ledger.

The primary goal is speed of entry, easy filtering, and fast retrieval of historical records.

---

# 2. Problem Statement

Current workflow:

* Users maintain handwritten notebooks.
* Searching historical records is difficult.
* Calculating totals requires manual effort.
* Reports require re-entering data into Excel.
* No easy way to filter transactions by date, person, type, or amount.

Users need:

* Fast data entry
* Centralized ledger
* Powerful filtering
* Export capabilities
* Fully offline operation

---

# 3. Product Vision

LogWise is not an accounting software.

It is a digital ledger system that enables users to:

* Record transactions quickly
* Search records instantly
* Filter records efficiently
* Export records easily
* Replace physical notebooks completely

---

# 4. Target Users

## Primary Users

* Construction contractors
* Site supervisors
* Equipment rental operators
* Material suppliers

## Secondary Users

* Small retail businesses
* Service providers
* Local business owners

---

# 5. Core Principles

### What LogWise Is

* One centralized ledger
* Spreadsheet-style data entry
* Keyboard-first workflow
* Filter-driven navigation
* Offline-first desktop software

### What LogWise Is Not

* Accounting software
* GST software
* Inventory management system
* ERP platform
* Multi-user system

---

# 6. Master Ledger Structure

Every record entered into the application is stored directly inside the master ledger.

## Ledger Fields

| Field        | Type           |
| ------------ | -------------- |
| Entry ID     | Auto Generated |
| Bill No      | Text           |
| Date         | Date           |
| Name         | Text           |
| Type         | Dropdown       |
| Phone Number | Text           |
| Hours        | Number         |
| Driver Name  | Text           |
| Amount       | Currency       |
| Notes        | Text           |
| Created At   | Timestamp      |

---

# 7. Transaction Types

Default transaction types:

* JCB
* Bricks
* Sand
* Labour
* Concrete
* Diesel
* Transport
* Rental
* Other

Users can add custom types.

---

# 8. Entry Experience

## Spreadsheet Entry Mode

No forms.

Users enter data directly into a grid similar to:

* Microsoft Excel
* Google Sheets
* Airtable

Example:

| Bill No | Date       | Name  | Type | Phone      | Hours | Driver | Amount |
| ------- | ---------- | ----- | ---- | ---------- | ----- | ------ | ------ |
| B001    | 20-06-2026 | Rahim | JCB  | 9876543210 | 5     | Kumar  | 3500   |

Press Enter to move to the next cell.

Press Enter on the last column to create a new row.

---

# 9. Keyboard Shortcuts

| Shortcut | Action       |
| -------- | ------------ |
| Enter    | Next Cell    |
| Tab      | Next Field   |
| Ctrl + S | Save         |
| Ctrl + N | New Row      |
| Ctrl + F | Open Filters |
| Ctrl + E | Export       |

---

# 10. Filtering System

Filtering is the primary navigation method.

Users should not need to scroll through large datasets.

## Available Filters

### Date Filter

* Today
* Yesterday
* This Week
* This Month
* Custom Range

### Type Filter

* JCB
* Bricks
* Labour
* Sand
* Custom Types

### Name Filter

Search by customer/vendor name.

### Driver Filter

Search by driver name.

### Phone Number Filter

Search by phone number.

### Amount Filter

* Minimum Amount
* Maximum Amount

### Bill Number Filter

Search directly by bill number.

---

# 11. Global Search

A universal search box should be available.

Examples:

Search:

Rahim

Returns all records containing Rahim.

Search:

JCB

Returns all JCB transactions.

Search:

9876543210

Returns all matching phone records.

---

# 12. Dashboard

Simple and minimal.

## Metrics

* Today's Entries
* Today's Total Amount
* Monthly Total Amount
* Total Records
* Recent Entries

---

# 13. Export System

Users should be able to export:

* Entire ledger
* Filtered records
* Custom date ranges

## Supported Formats

### Excel

.xlsx

### CSV

.csv

### PDF

.pdf

---

# 14. Backup & Restore

## Backup

Creates:

logwise_backup.db

## Restore

Import previously created backup database.

---

# 15. Database

## Database Engine

SQLite

## Reason

* Fully offline
* No server required
* Fast performance
* Easy backup
* Single database file

---

# 16. Performance Requirements

* Application startup under 3 seconds
* Save operation under 1 second
* Search results under 1 second
* Support 100,000+ records
* Support large exports

---

# 17. Technology Stack

## Desktop Framework

Electron

## Frontend

React

TypeScript

## UI Framework

Shadcn UI

Tailwind CSS

## Database

SQLite

## Table Component

AG Grid

Reason:

* Spreadsheet experience
* Fast filtering
* Large dataset support
* Keyboard navigation

---

# 18. Version 1 Scope

## Included

* Master Ledger
* Spreadsheet Entry
* Global Search
* Filters
* Export
* Backup
* Restore
* SQLite Storage
* Keyboard Shortcuts

## Excluded

* GST
* Accounting
* Inventory
* Multiple Users
* Cloud Sync
* Mobile App
* Role Management
* Analytics

---

# 19. Success Criteria

A user currently using a notebook should be able to:

1. Open LogWise.
2. Enter a transaction within 5 seconds.
3. Find any historical record within 10 seconds using filters.
4. Export records in one click.
5. Operate completely offline.
6. Replace physical ledgers with LogWise.

---

