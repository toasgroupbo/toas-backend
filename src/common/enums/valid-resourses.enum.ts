export enum ValidResoursesForAdmins {
  USER = 'USER',
  COMPANY = 'COMPANY',
  CUSTOMER = 'CUSTOMER',

  //! permisos de una company
  CASHIER = 'CASHIER',
  OWNER = 'OWNER',
  BUS = 'BUS',
  PLACES = 'PLACES',
  OFFICE = 'OFFICE',
  ROUTE = 'ROUTE',
  TRAVEL = 'TRAVEL',
  //TICKET = 'TICKET',

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
  PLACE = 'PLACE',
  OFFICE = 'OFFICE',
  ROUTE = 'ROUTE',
  TRAVEL = 'TRAVEL',
  TICKET = 'TICKET',

  FILE = 'FILE',

  //! solo el cashier
  CASHIER_TRAVEL = 'CASHIER_TRAVEL',
  CASHIER_TICKET = 'CASHIER_TICKET',
  CASHIER_CUSTOMER = 'CASHIER_CUSTOMER',
}
