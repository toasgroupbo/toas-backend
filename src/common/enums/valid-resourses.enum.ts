export enum ValidResoursesForAdmins {
  USER = 'USER',
  COMPANY = 'COMPANY',
  CUSTOMER = 'CUSTOMER',

  //! permisos de una company
  CASHIER = 'CASHIER',
  OWNER = 'OWNER',
  BUS = 'BUS',
  OFFICE = 'OFFICE',
  ROUTE = 'ROUTE',
  TRAVEL = 'TRAVEL',
  //TICKET = 'TICKET',
  PLACES = 'PLACES',

  FILE = 'FILE',
}

export enum ValidResourses {
  //! solo el superadmin
  ROL = 'ROL',

  USER = 'USER',
  COMPANY = 'COMPANY',
  CUSTOMER = 'CUSTOMER',

  BANK_ACCOUNT = 'BANK_ACCOUNT',

  CASHIER = 'CASHIER',
  OWNER = 'OWNER',
  BUS = 'BUS',
  OFFICE = 'OFFICE',
  ROUTE = 'ROUTE',
  TRAVEL = 'TRAVEL',
  TICKET = 'TICKET',
  PLACE = 'PLACE',

  FILE = 'FILE',

  //! solo el cashier
  CASHIER_BUS = 'CASHIER_BUS',

  CASHIER_ROUTE = 'CASHIER_ROUTE',

  CASHIER_TRAVEL = 'CASHIER_TRAVEL',

  CASHIER_TICKET = 'CASHIER_TICKET',

  CASHIER_CUSTOMER = 'CASHIER_CUSTOMER',

  //customer
}
