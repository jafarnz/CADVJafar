-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localgigs.cy360swu2vq9.us-east-1.rds.amazonaws.com    Database: localgigs
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '';

--
-- Table structure for table `Events`
--

DROP TABLE IF EXISTS `Events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Events` (
  `eventID` int NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `description` text,
  `eventDate` date DEFAULT NULL,
  `eventTime` time DEFAULT NULL,
  `venueID` int DEFAULT NULL,
  PRIMARY KEY (`eventID`),
  KEY `venueID` (`venueID`),
  CONSTRAINT `Events_ibfk_1` FOREIGN KEY (`venueID`) REFERENCES `Venues` (`venueID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Events`
--

LOCK TABLES `Events` WRITE;
/*!40000 ALTER TABLE `Events` DISABLE KEYS */;
INSERT INTO `Events` VALUES (1,'jcole day','dreamville fest','2025-07-17','19:00:00',1001),(1001,'Indie Music Fest','A night of indie local talent','2025-07-15','19:00:00',2001),(2001,'Indie Summer Fest','Singapore\'s best indie artists.','2025-07-15','18:30:00',1001),(2002,'Jazz Night','Smooth jazz and wine.','2025-07-20','19:00:00',1002),(2003,'Rock the Stage','Rock bands battle it out.','2025-07-25','20:00:00',1003),(2004,'HipHop SG','Underground hiphop showcase.','2025-08-01','19:30:00',1004),(2005,'Electronic Vibes','EDM and house DJs.','2025-08-03','21:00:00',1005),(2006,'Metalcore Madness','Heavy music for heavy heads.','2025-08-10','19:00:00',1006),(2007,'Soul & R&B Live','Soulful singers unite.','2025-08-15','20:30:00',1007),(2008,'Street Rap Sessions','Local rap talent showcase.','2025-08-17','19:00:00',1008),(2009,'Reggae Sunday','Island vibes and chill.','2025-08-20','17:00:00',1009),(2010,'K-Pop Dance Off','K-pop cover group battles.','2025-08-25','18:00:00',1010);
/*!40000 ALTER TABLE `Events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Venues`
--

DROP TABLE IF EXISTS `Venues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Venues` (
  `venueID` int NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `address` varchar(200) DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `latitude` decimal(10,6) DEFAULT NULL,
  `longitude` decimal(10,6) DEFAULT NULL,
  PRIMARY KEY (`venueID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Venues`
--

LOCK TABLES `Venues` WRITE;
/*!40000 ALTER TABLE `Venues` DISABLE KEYS */;
INSERT INTO `Venues` VALUES (23,'Temasek Poly Auditorium 2','21 Tampines Street, Singapore',522,NULL,NULL),(24,'Temasek Poly Auditorium 2','21 Tampines Street, Singapore',522,NULL,NULL),(30,'Pasir Ris Secondary School','21 Tampines Street, Singapore',522,1.351618,103.949057),(31,'Pasir Ris Secondary School','21 Tampines Street, Singapore',522,1.351618,103.949057),(1001,'Temasek Poly Auditorium 1','21 Tampines Street, Singapore',5000,1.306600,123.789000),(1002,'Esplanade Hall','1 Esplanade Dr, SG',1600,1.289500,103.855300),(1003,'The Substation','45 Armenian St, SG',400,1.294500,103.851000),(1004,'Scape Ground Theatre','2 Orchard Link, SG',650,1.300400,103.839800),(1005,'Singapore Expo','1 Expo Dr, SG',12000,1.334100,103.961100),(1006,'Goodman Arts Centre','90 Goodman Rd, SG',300,1.306900,103.888200),(1007,'Aliwal Arts Centre','28 Aliwal St, SG',200,1.300200,103.860200),(1008,'Hard Rock Cafe SG','50 Cuscaden Rd, SG',350,1.305700,103.824900),(1009,'Victoria Concert Hall','9 Empress Pl, SG',900,1.287900,103.851800),(1010,'Capitol Theatre','17 Stamford Rd, SG',980,1.294200,103.852400),(2001,'The Star Theatre','1 Vista Exchange Green, Singapore 138617',5000,1.306600,103.789000);
/*!40000 ALTER TABLE `Venues` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-29 23:40:31
