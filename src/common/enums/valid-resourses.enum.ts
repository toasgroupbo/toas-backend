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
  TRAVEL_CASHIER = 'TRAVEL_CASHIER',
  TICKET_CASHIER = 'TICKET_CASHIER',
  CUSTOMER_CASHIER = 'CUSTOMER_CASHIER',
  ROUTES_CASHIER = 'ROUTES_CASHIER',

  //! en app
  TICKET_APP = 'TICKET_APP',
  CUSTOMER_APP = 'CUSTOMER_APP',
  TRAVEL_APP = 'TRAVEL_APP',
  ROUTE_APP = 'ROUTE_APP',
}
