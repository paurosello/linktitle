#Installation
```
$ bench get-app linktitle https://github.com/paurosello/linktitle
$ bench --site {site} install-app linktitle
```
#How does this work?
ControlLink has been extended in order to show the Title field once a Document is selected.

A REST call is used in order to retrieve the title of the document, if no Title is defined it defaults to Name. 
If your app contains many links it could affect the performance of your server

#Example GIF
![](http://g.recordit.co/ud7f2Aq8t4.gif)

#### License
MIT
