dev-box  
=======  

Local development environment for widgets preview  

1. Install AppsNgen develop box  

	1.1 Execute: npm install appsngen-dev-box  
	1.2 Execute: grunt bower  

2. Install AppsNgen widget viewer   

	2.1 Execute: npm install appsngen-viewer  

3. Set list of developed widgets by writing full path to .zip file of widget  

	3.1 Go to node_modules\appsngen-dev-box\widgetslist.json.  
	3.2 Write full path to .zip in json format: see examples in this file.  
	3.3 Save and close file.  

4. Start viewer server  

	4.1 Go to node_modules\appsngen-viewer\  
	4.2 Execute: node server.js   

5. Start dev-box server  

	5.1 Go to node_modules\appsngen-dev-box\  
	5.2 Execute: node server.js   

6. Open dev-box  

	6.1 Browse http://localhost:8879  
	6.2 Login using AppsNgen login/password  
