// ./docs/apiDocs.js
const apiDocs = [
  {
    method: 'POST',
    path: '/api/register',
    description: 'Registers a new user',
    bodyParams: ['firstname', 'lastname', 'username', 'email', 'password', 'usertype_id'],
    NOTE: 'usertype_id should be a Dropdown value and in backend only value [1, 2, 3, 4] should be passed. Also, in frontend ask user only for the email and later on pass that email as the username and send it to the backend.'
  },
  {
    method: 'POST',
    path: '/api/login',
    description: 'Logs in a user and returns a JWT token',
    bodyParams: ['username', 'password'],
    NOTE: 'https://www.npmjs.com/package/jwt-decode  -  Use <npm i jwt-decode> use this link to decode the JWT token and get the information of the user.'
  },
  {
    method: 'PUT',
    path: '/api/update-password',
    description: 'Updates user password',
    bodyParams: ['username', 'oldPassword', 'newPassword']
  },
  {
    method: 'GET',
    path: '/api/:table',
    description: 'Get all records from a table',
    urlParams: ['table']
  },
  {
    method: 'GET',
    path: '/api/:table/:id',
    description: 'Get a specific record from a table by ID',
    urlParams: ['table', 'id']
  },
  {
    method: 'POST',
    path: '/api/:table',
    description: 'Create a new record in a table',
    urlParams: ['table'],
    bodyParams: ['<fields based on table>']
  },
  {
    method: 'PUT',
    path: '/api/:table/:id',
    description: 'Update a record in a table',
    urlParams: ['table', 'id'],
    bodyParams: ['<fields to update>']
  },
  {
    method: 'DELETE',
    path: '/api/:table/:id',
    description: 'Delete a record from a table',
    urlParams: ['table', 'id']
  },
  {
    method: "GET",
    path: "/api/user/:id/usertype",
    description: "Fetches user details along with assigned usertype and portal information by user ID.",
    pathParams: ["id"],
    NOTE: "The 'id' is the user Linkeduserid from the people table. The endpoint returns user info joined with usertype and portal data. Returns 404 if user not found."
  },
  {
    method: 'PUT',
    path: '/api/people/:id',
    description: 'Updates the People record for a user and reflects relevant changes to the Users table (e.g., fullname, email). Only accessible by Staff - Standard User or System Admin.',
    urlParams: ['id'],
    bodyParams: [
      'Firstname',
      'Lastname',
      'Emailaddress',
      'Middlename',
      'Preferredname',
      'Country',
      'State',
      'Suburb',
      'Postcode',
      'HomeAddress',
      'Workaddress',
      'TFN',
      'BSB',
      'Bankaccountnumber',
    ],
    NOTE: 'The :id is the Linkeduserid from the People table. The API updates People data and updates corresponding Users fields fullname and email accordingly. Requires Authorization header with a valid JWT token belonging to either Staff - Standard User or System Admin.'
  },
  {
    method: 'GET',
    path: '/api/:table/paginated',
    description: 'Get paginated records from a specific table.',
    urlParams: ['table'],
    queryParams: ['limit', 'page'],
    NOTE: 'The `table` parameter is the name of the table (e.g., Users). `limit` can be one of [5, 10, 20, 50]. `page` starts from 1. Returns a data array and a pagination object. Example: /api/Users/paginated?limit=10&page=2'
  },
  {
    method: 'POST',
    path: '/api/link-client-user-location',
    description: 'Links a Client - Standard User to the client for a specific location. Only accessible by Staff - Standard User or System Admin.',
    bodyParams: ['userid', 'clientlocationid'],
    NOTE: 'Requires Authorization header with a valid JWT token belonging to either Staff - Standard User or System Admin. The userid must be a Client - Standard User. The clientlocationid must exist and be linked to a client. If the user is already linked to the client, the API will return a message indicating so. make sure the ID of the location is the ClientLocation table ID not clientID. Once this is linked you can view the result in the table Userclients and in there the value you will see is clientID value.',
    example: {
      "userid": 38,
      "clientlocationid": 9 //this is the ClientLocation table ID not clientID
    }
  },
  {
    method: 'POST',
    path: '/api/clientshiftrequests',
    description: 'Creates a new client shift request and related staff shift slots. Only accessible by Client - Standard User or System Admin.',
    bodyParams: [
      'clientlocationid',
      'shiftdate',
      'starttime',
      'endtime',
      'qualificationid',
      'totalrequiredstaffnumber',
      'additionalvalue'
    ],
    NOTE: 'Requires Authorization header with a valid JWT token belonging to either Client - Standard User or System Admin. The user must be linked to the client for the location in the Userclients table. The clientlocationid must exist and be linked to a client. The qualificationid must exist in Lookups and be of type Qualification. The API will create N staff shift slots in Clientstaffshifts, where N = totalrequiredstaffnumber.',
    example: {
      "clientlocationid": 9,
      "shiftdate": "2025-06-05",
      "starttime": "2025-06-05 08:00:00",
      "endtime": "2025-06-05 16:00:00",
      "qualificationid": 12,
      "totalrequiredstaffnumber": 3,
      "additionalvalue": "Day shift, urgent"
    }
  }

];

module.exports = apiDocs;
