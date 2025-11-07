export enum ValidResoursesForAdmins {
  USER = 'USER',
  COMPANY = 'COMPANY',
  CUSTOMER = 'CUSTOMER',

  //! permisos de una company
  OFFICE = 'OFFICE',
  OWNER = 'OWNER',
  ROUTE = 'ROUTE',
  BUS = 'BUS',
  TRAVEL = 'TRAVEL',
  CASHIER = 'CASHIER',
  FILE = 'FILE',
}

export enum ValidResourses {
  //! solo el superadmin
  ROL = 'ROL',

  USER = 'USER',
  COMPANY = 'COMPANY',
  CUSTOMER = 'CUSTOMER',
  CASHIER = 'CASHIER',
  OWNER = 'OWNER',
  BUS = 'BUS',
  OFFICE = 'OFFICE',
  ROUTE = 'ROUTE',
  TRAVEL = 'TRAVEL',
  FILE = 'FILE',

  //! solo el cashier
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  TICKET = 'TICKET',
}
