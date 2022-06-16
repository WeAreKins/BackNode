# Hi, I am #Back
I can convert your database to API just by installing me! 

![](https://karippal.in/wp-content/uploads/2022/06/Screenshot-2022-06-16-at-2.52.17-PM.png)

I am **#Back**, a no-code microservice to develop RestAPI without coding the backend. I can automatically generate APIs from your database and make your APIs secure with JWT.

Supported Microservice Platforms:
- [x] NodeJS
- [ ]  PYTHON
- [ ] Java
- [ ] .Net

Supported Database Platforms:
- [x] MySQL/MariaDB 
- [ ] Microsoft SQL Server
- [ ] PostgreSQL
- [ ] Oracle Database


New database platforms are coming shortly! We are in testing.

## I Have a Dream
My goal is to make development more enjoyable and productive.
To become a full-stack developer is like being an all-rounder, Which is less enjoyable. My dream is to make a developer into a full-stack developer without knowing about backend technologies.

## Get Started (Installation)
Please follow the steps to install the **#Back** desktop application.
- Download the latest reversion of #Back Application form releases
- Install the application and create an account.
- Click Create application and enter your Database server Details
- On the open application, you can see all APIs 

Download the latest version at /github/v/release/WeAreKins/BackNode

## APIs
The service has two types of APIs, GET to retrieve data and POST to insert or update data.  Please use `Content-Type: application/json` in the request header.
### DATA APIs
APIs are generated automatically from a database table called DATA APIs
> To access DATA APIs, use: *server_url*/**data**/*table_name*

example: `http://localhost/data/users` in this case, Table name users.

|  Methods | Parameter  |  Data Type  |   Remarks |
| ------------ | ------------ | ------------ | ------------ |
|  GET | limit  |  Numeric |  Retrive data limit |
|   |  offset | Numeric  |  Retrive data offset |
|   |  where |  String | pass entire SQL where contion to query parameter like `id>5 AND active = 1`|
| POST  | set  | Object  | JSON object of column name and data. example:   |
|   |  where |  String |  Pass entire SQL where contion to body like `id=15` |


In the API method, POST has a where parameter it uses as an update. 

### Custom API
For custom APIs SQL is used, for example:

`SELECT * FROM users WHERE id={{user_id}}`

`{{user_id}}` is a dynamic parameter that can pass through a query parameter in the GET method or with a request body in the POST method.

### User and Permission Management
The #Back application is integrated with the user and permission management and uses JWT security to protect APIs from Mellitus activities.

### Download the NodeJS microservice

Go-to Download menu in the application, double-check the configuration, and save the back-node microservice zip file to your local system.

Please Note: In case your database and application source are on the same server, please remove the Over SSH option in configuration.
Deploy server 

###  Microservice Installation
Upload the #back-node source to your server and set up your virtual host pointing to the node-back source.

## Thanks
If you find any issues, please share them with us. Thanks for supporting us.
