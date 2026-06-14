import type { Position } from '../types';

export interface RealPlayer {
  name: string;
  pos: Position;
  age: number;
  ovr: number;
  pot: number;
  salary: number;
  years: number;
}

export const REAL_ROSTERS: Record<string, RealPlayer[]> = {
  // t1 - Boston Celtics
  t1: [
    { name: 'Jayson Tatum', pos: 'SF', age: 27, ovr: 96, pot: 97, salary: 34.0, years: 4 },
    { name: 'Jaylen Brown', pos: 'SG', age: 29, ovr: 90, pot: 91, salary: 49.0, years: 3 },
    { name: 'Derrick White', pos: 'SG', age: 31, ovr: 82, pot: 82, salary: 22.5, years: 2 },
    { name: 'Payton Pritchard', pos: 'PG', age: 28, ovr: 80, pot: 81, salary: 13.5, years: 3 },
    { name: 'Nikola Vucevic', pos: 'C', age: 35, ovr: 78, pot: 78, salary: 18.0, years: 1 },
    { name: 'Sam Hauser', pos: 'SF', age: 27, ovr: 77, pot: 79, salary: 12.0, years: 2 },
    { name: 'Baylor Scheierman', pos: 'SG', age: 24, ovr: 72, pot: 79, salary: 4.5, years: 3 },
    { name: 'Neemias Queta', pos: 'C', age: 25, ovr: 72, pot: 79, salary: 5.0, years: 2 },
    { name: 'Jordan Walsh', pos: 'SF', age: 22, ovr: 67, pot: 78, salary: 4.0, years: 2 },
    { name: 'Dalano Banton', pos: 'PG', age: 25, ovr: 69, pot: 74, salary: 3.5, years: 1 },
    { name: 'Ron Harper Jr.', pos: 'SG', age: 24, ovr: 66, pot: 73, salary: 2.0, years: 1 },
    { name: 'Anton Shulga', pos: 'PG', age: 22, ovr: 63, pot: 75, salary: 1.5, years: 2 },
  ],

  // t2 - Brooklyn Nets
  t2: [
    { name: 'Michael Porter Jr.', pos: 'SF', age: 27, ovr: 84, pot: 86, salary: 33.5, years: 2 },
    { name: 'Nic Claxton', pos: 'C', age: 26, ovr: 80, pot: 82, salary: 21.0, years: 3 },
    { name: 'Terence Mann', pos: 'SG', age: 28, ovr: 74, pot: 75, salary: 10.0, years: 2 },
    { name: 'Alex Demin', pos: 'PG', age: 20, ovr: 69, pot: 85, salary: 4.0, years: 3 },
    { name: 'Noah Clowney', pos: 'PF', age: 21, ovr: 68, pot: 80, salary: 4.5, years: 3 },
    { name: 'Ochai Agbaji', pos: 'SF', age: 25, ovr: 72, pot: 76, salary: 5.5, years: 2 },
    { name: 'Ziaire Williams', pos: 'SF', age: 23, ovr: 71, pot: 78, salary: 5.5, years: 2 },
    { name: 'Jalen Wilson', pos: 'SF', age: 24, ovr: 70, pot: 75, salary: 3.5, years: 2 },
    { name: 'Tyrese Martin', pos: 'SG', age: 25, ovr: 68, pot: 73, salary: 3.0, years: 1 },
    { name: 'David Minott', pos: 'SF', age: 22, ovr: 65, pot: 74, salary: 1.8, years: 2 },
    { name: 'Keon Johnson', pos: 'SG', age: 23, ovr: 67, pot: 75, salary: 2.5, years: 2 },
    { name: 'Eric Liddell', pos: 'PG', age: 24, ovr: 63, pot: 71, salary: 1.5, years: 1 },
  ],

  // t3 - New York Knicks
  t3: [
    { name: 'Jalen Brunson', pos: 'PG', age: 29, ovr: 92, pot: 93, salary: 28.0, years: 3 },
    { name: 'Karl-Anthony Towns', pos: 'C', age: 30, ovr: 88, pot: 88, salary: 49.5, years: 2 },
    { name: 'OG Anunoby', pos: 'SF', age: 28, ovr: 85, pot: 86, salary: 37.0, years: 3 },
    { name: 'Mikal Bridges', pos: 'SG', age: 28, ovr: 84, pot: 85, salary: 25.0, years: 3 },
    { name: 'Josh Hart', pos: 'SG', age: 30, ovr: 80, pot: 80, salary: 19.5, years: 2 },
    { name: 'Mitchell Robinson', pos: 'C', age: 27, ovr: 76, pot: 78, salary: 14.0, years: 2 },
    { name: 'Miles McBride', pos: 'PG', age: 24, ovr: 76, pot: 80, salary: 7.0, years: 2 },
    { name: 'Jeremy Sochan', pos: 'PF', age: 22, ovr: 75, pot: 84, salary: 6.0, years: 3 },
    { name: 'Jose Alvarado', pos: 'PG', age: 27, ovr: 74, pot: 75, salary: 8.0, years: 2 },
    { name: 'Jordan Clarkson', pos: 'SG', age: 33, ovr: 77, pot: 77, salary: 13.5, years: 1 },
    { name: 'Tyler Kolek', pos: 'PG', age: 23, ovr: 68, pot: 78, salary: 3.5, years: 2 },
    { name: 'Pacome Dadiet', pos: 'SF', age: 20, ovr: 65, pot: 80, salary: 2.5, years: 3 },
    { name: 'Isaiah Hukporti', pos: 'C', age: 22, ovr: 63, pot: 76, salary: 2.0, years: 2 },
  ],

  // t4 - Philadelphia 76ers
  t4: [
    { name: 'Joel Embiid', pos: 'C', age: 31, ovr: 95, pot: 95, salary: 51.0, years: 3 },
    { name: 'Tyrese Maxey', pos: 'PG', age: 25, ovr: 90, pot: 92, salary: 35.0, years: 4 },
    { name: 'Paul George', pos: 'SF', age: 35, ovr: 84, pot: 84, salary: 35.0, years: 2 },
    { name: 'Quentin Grimes', pos: 'SG', age: 25, ovr: 76, pot: 80, salary: 11.0, years: 2 },
    { name: 'Kyle Lowry', pos: 'PG', age: 39, ovr: 68, pot: 68, salary: 9.0, years: 1 },
    { name: 'Andre Drummond', pos: 'C', age: 32, ovr: 72, pot: 72, salary: 6.0, years: 1 },
    { name: 'Kelly Oubre Jr.', pos: 'SF', age: 29, ovr: 74, pot: 75, salary: 12.5, years: 2 },
    { name: 'Adem Bona', pos: 'C', age: 22, ovr: 65, pot: 75, salary: 2.5, years: 2 },
    { name: 'Justin Edwards', pos: 'SG', age: 21, ovr: 64, pot: 79, salary: 2.5, years: 2 },
    { name: 'Jeff Dowtin Jr.', pos: 'PG', age: 27, ovr: 66, pot: 69, salary: 2.0, years: 1 },
    { name: 'Reggie Jackson', pos: 'PG', age: 35, ovr: 69, pot: 69, salary: 3.0, years: 1 },
    { name: 'Trae Blaze', pos: 'SG', age: 22, ovr: 62, pot: 72, salary: 1.8, years: 1 },
  ],

  // t5 - Toronto Raptors
  t5: [
    { name: 'Scottie Barnes', pos: 'SF', age: 24, ovr: 86, pot: 91, salary: 30.0, years: 4 },
    { name: 'RJ Barrett', pos: 'SG', age: 25, ovr: 84, pot: 87, salary: 29.0, years: 3 },
    { name: 'Brandon Ingram', pos: 'SF', age: 28, ovr: 85, pot: 86, salary: 36.0, years: 2 },
    { name: 'Immanuel Quickley', pos: 'PG', age: 26, ovr: 82, pot: 85, salary: 24.0, years: 4 },
    { name: 'Jakob Poeltl', pos: 'C', age: 30, ovr: 79, pot: 80, salary: 22.0, years: 2 },
    { name: 'Gradey Dick', pos: 'SG', age: 22, ovr: 73, pot: 83, salary: 5.5, years: 3 },
    { name: 'Trayce Jackson-Davis', pos: 'C', age: 25, ovr: 72, pot: 78, salary: 5.0, years: 2 },
    { name: 'Markquis Shead', pos: 'PG', age: 24, ovr: 67, pot: 74, salary: 2.5, years: 2 },
    { name: 'Garrett Temple', pos: 'SG', age: 39, ovr: 62, pot: 62, salary: 2.0, years: 1 },
    { name: 'Jonathan Mogbo', pos: 'PF', age: 22, ovr: 65, pot: 76, salary: 2.8, years: 3 },
    { name: 'Sandro Mamukelashvili', pos: 'PF', age: 26, ovr: 67, pot: 71, salary: 3.5, years: 1 },
    { name: 'Ulrich Chomche', pos: 'C', age: 20, ovr: 63, pot: 78, salary: 2.0, years: 3 },
  ],

  // t6 - Chicago Bulls
  t6: [
    { name: 'Josh Giddey', pos: 'PG', age: 23, ovr: 81, pot: 87, salary: 8.0, years: 3 },
    { name: 'Anfernee Simons', pos: 'SG', age: 26, ovr: 83, pot: 85, salary: 26.0, years: 3 },
    { name: 'Zach Collins', pos: 'C', age: 27, ovr: 74, pot: 76, salary: 13.5, years: 2 },
    { name: 'Tre Jones', pos: 'PG', age: 25, ovr: 75, pot: 78, salary: 9.0, years: 2 },
    { name: 'Patrick Williams', pos: 'PF', age: 24, ovr: 76, pot: 82, salary: 12.0, years: 3 },
    { name: 'Matas Buzelis', pos: 'SF', age: 20, ovr: 71, pot: 86, salary: 4.5, years: 3 },
    { name: 'Rob Dillingham', pos: 'PG', age: 21, ovr: 72, pot: 85, salary: 5.5, years: 3 },
    { name: 'Guerschon Yabusele', pos: 'PF', age: 29, ovr: 74, pot: 75, salary: 7.0, years: 2 },
    { name: 'Nick Richards', pos: 'C', age: 27, ovr: 70, pot: 72, salary: 5.0, years: 2 },
    { name: 'Isaac Okoro', pos: 'SF', age: 24, ovr: 72, pot: 76, salary: 8.0, years: 2 },
    { name: 'Mac McClung', pos: 'PG', age: 26, ovr: 68, pot: 72, salary: 3.5, years: 1 },
    { name: 'Collin Sexton', pos: 'SG', age: 27, ovr: 74, pot: 76, salary: 11.0, years: 2 },
  ],

  // t7 - Cleveland Cavaliers
  t7: [
    { name: 'Donovan Mitchell', pos: 'SG', age: 29, ovr: 92, pot: 93, salary: 35.0, years: 3 },
    { name: 'Evan Mobley', pos: 'PF', age: 24, ovr: 89, pot: 93, salary: 24.0, years: 4 },
    { name: 'Jarrett Allen', pos: 'C', age: 27, ovr: 82, pot: 84, salary: 20.0, years: 2 },
    { name: 'James Harden', pos: 'PG', age: 36, ovr: 84, pot: 84, salary: 35.0, years: 1 },
    { name: 'Max Strus', pos: 'SF', age: 29, ovr: 76, pot: 77, salary: 13.0, years: 2 },
    { name: 'Sam Merrill', pos: 'SG', age: 29, ovr: 73, pot: 74, salary: 6.5, years: 2 },
    { name: 'Dennis Schröder', pos: 'PG', age: 32, ovr: 77, pot: 77, salary: 13.0, years: 1 },
    { name: 'Larry Nance Jr.', pos: 'PF', age: 33, ovr: 72, pot: 72, salary: 9.0, years: 1 },
    { name: 'Thomas Bryant', pos: 'C', age: 28, ovr: 71, pot: 73, salary: 5.0, years: 1 },
    { name: 'Caris LeVert', pos: 'SG', age: 31, ovr: 73, pot: 73, salary: 11.0, years: 1 },
    { name: 'Emoni Bates', pos: 'SF', age: 22, ovr: 65, pot: 76, salary: 2.0, years: 2 },
    { name: 'Javonte Green', pos: 'SF', age: 31, ovr: 66, pot: 67, salary: 2.0, years: 1 },
  ],

  // t8 - Detroit Pistons
  t8: [
    { name: 'Cade Cunningham', pos: 'PG', age: 24, ovr: 87, pot: 91, salary: 33.0, years: 4 },
    { name: 'Jalen Duren', pos: 'C', age: 22, ovr: 78, pot: 87, salary: 13.0, years: 3 },
    { name: 'Ausar Thompson', pos: 'SF', age: 22, ovr: 76, pot: 85, salary: 9.5, years: 3 },
    { name: 'Isaiah Stewart', pos: 'PF', age: 24, ovr: 75, pot: 79, salary: 16.5, years: 3 },
    { name: 'Tobias Harris', pos: 'SF', age: 33, ovr: 74, pot: 74, salary: 20.0, years: 1 },
    { name: 'Kevin Huerter', pos: 'SG', age: 27, ovr: 74, pot: 76, salary: 17.0, years: 2 },
    { name: 'Duncan Robinson', pos: 'SG', age: 31, ovr: 75, pot: 75, salary: 18.5, years: 2 },
    { name: 'Ron Holland', pos: 'SF', age: 20, ovr: 69, pot: 84, salary: 6.5, years: 3 },
    { name: 'Simone Fontecchio', pos: 'SF', age: 29, ovr: 73, pot: 74, salary: 10.0, years: 1 },
    { name: 'Marcus Sasser', pos: 'PG', age: 24, ovr: 68, pot: 74, salary: 3.5, years: 2 },
    { name: 'Bobi Klintman', pos: 'PF', age: 22, ovr: 63, pot: 72, salary: 1.8, years: 2 },
    { name: 'Paul Reed', pos: 'C', age: 26, ovr: 69, pot: 74, salary: 5.0, years: 2 },
  ],

  // t9 - Indiana Pacers
  t9: [
    { name: 'Tyrese Haliburton', pos: 'PG', age: 26, ovr: 90, pot: 92, salary: 26.0, years: 4 },
    { name: 'Pascal Siakam', pos: 'PF', age: 32, ovr: 86, pot: 86, salary: 37.5, years: 2 },
    { name: 'Ivica Zubac', pos: 'C', age: 28, ovr: 79, pot: 80, salary: 20.0, years: 2 },
    { name: 'Aaron Nesmith', pos: 'SF', age: 25, ovr: 76, pot: 78, salary: 18.0, years: 3 },
    { name: 'Andrew Nembhard', pos: 'PG', age: 26, ovr: 75, pot: 79, salary: 10.0, years: 2 },
    { name: 'TJ McConnell', pos: 'PG', age: 33, ovr: 73, pot: 73, salary: 11.0, years: 1 },
    { name: 'Obi Toppin', pos: 'PF', age: 27, ovr: 74, pot: 76, salary: 14.0, years: 2 },
    { name: 'Johnny Furphy', pos: 'SF', age: 21, ovr: 68, pot: 78, salary: 3.5, years: 3 },
    { name: 'Jarace Walker', pos: 'PF', age: 23, ovr: 71, pot: 80, salary: 7.0, years: 3 },
    { name: 'Jaylen Huff', pos: 'C', age: 22, ovr: 64, pot: 75, salary: 2.5, years: 2 },
    { name: 'Quenton Jackson', pos: 'SG', age: 25, ovr: 66, pot: 70, salary: 2.0, years: 1 },
    { name: 'Jalen Slawson', pos: 'PF', age: 24, ovr: 65, pot: 70, salary: 1.8, years: 1 },
  ],

  // t10 - Milwaukee Bucks
  t10: [
    { name: 'Giannis Antetokounmpo', pos: 'PF', age: 31, ovr: 97, pot: 97, salary: 51.0, years: 2 },
    { name: 'Myles Turner', pos: 'C', age: 29, ovr: 81, pot: 82, salary: 19.0, years: 2 },
    { name: 'Kyle Kuzma', pos: 'SF', age: 30, ovr: 80, pot: 81, salary: 22.0, years: 2 },
    { name: 'Gary Trent Jr.', pos: 'SG', age: 26, ovr: 78, pot: 79, salary: 17.0, years: 2 },
    { name: 'Bobby Portis', pos: 'PF', age: 31, ovr: 76, pot: 76, salary: 12.0, years: 1 },
    { name: 'Taurean Prince', pos: 'SF', age: 31, ovr: 73, pot: 73, salary: 9.0, years: 1 },
    { name: 'Kevin Porter Jr.', pos: 'SG', age: 25, ovr: 74, pot: 77, salary: 14.0, years: 2 },
    { name: 'Gary Harris', pos: 'SG', age: 31, ovr: 70, pot: 70, salary: 7.5, years: 1 },
    { name: 'AJ Green', pos: 'SG', age: 25, ovr: 71, pot: 75, salary: 7.0, years: 2 },
    { name: 'Andre Jackson Jr.', pos: 'SF', age: 22, ovr: 67, pot: 77, salary: 3.0, years: 2 },
    { name: 'Pete Nance', pos: 'PF', age: 25, ovr: 66, pot: 71, salary: 2.5, years: 1 },
    { name: 'Ousmane Dieng', pos: 'SF', age: 23, ovr: 69, pot: 79, salary: 4.5, years: 2 },
  ],

  // t11 - Atlanta Hawks
  t11: [
    { name: 'Jalen Johnson', pos: 'PF', age: 24, ovr: 84, pot: 89, salary: 16.0, years: 4 },
    { name: 'Jonathan Kuminga', pos: 'SF', age: 23, ovr: 81, pot: 87, salary: 29.0, years: 4 },
    { name: 'Dyson Daniels', pos: 'SG', age: 22, ovr: 82, pot: 89, salary: 6.5, years: 3 },
    { name: 'CJ McCollum', pos: 'SG', age: 34, ovr: 80, pot: 80, salary: 30.0, years: 1 },
    { name: 'Onyeka Okongwu', pos: 'C', age: 25, ovr: 79, pot: 83, salary: 18.0, years: 3 },
    { name: 'Zaccharie Risacher', pos: 'SF', age: 20, ovr: 73, pot: 87, salary: 7.5, years: 3 },
    { name: 'Nickeil Alexander-Walker', pos: 'SG', age: 27, ovr: 75, pot: 77, salary: 10.0, years: 2 },
    { name: 'Buddy Hield', pos: 'SG', age: 33, ovr: 74, pot: 74, salary: 12.0, years: 1 },
    { name: 'Corey Kispert', pos: 'SF', age: 26, ovr: 73, pot: 76, salary: 15.0, years: 2 },
    { name: 'Gabe Vincent', pos: 'PG', age: 29, ovr: 71, pot: 72, salary: 11.0, years: 1 },
    { name: 'Caleb Houstan', pos: 'SF', age: 23, ovr: 68, pot: 76, salary: 3.5, years: 2 },
    { name: 'Asa Newell', pos: 'PF', age: 19, ovr: 66, pot: 83, salary: 4.5, years: 3 },
  ],

  // t12 - Charlotte Hornets
  t12: [
    { name: 'LaMelo Ball', pos: 'PG', age: 24, ovr: 88, pot: 92, salary: 32.0, years: 3 },
    { name: 'Brandon Miller', pos: 'SF', age: 22, ovr: 80, pot: 88, salary: 12.0, years: 3 },
    { name: 'Miles Bridges', pos: 'SF', age: 28, ovr: 79, pot: 80, salary: 21.0, years: 2 },
    { name: 'Coby White', pos: 'PG', age: 25, ovr: 79, pot: 82, salary: 19.0, years: 3 },
    { name: 'Kon Knueppel', pos: 'SG', age: 20, ovr: 71, pot: 85, salary: 5.5, years: 3 },
    { name: 'Josh Green', pos: 'SG', age: 24, ovr: 73, pot: 77, salary: 14.0, years: 2 },
    { name: 'Grant Williams', pos: 'PF', age: 26, ovr: 74, pot: 76, salary: 13.0, years: 2 },
    { name: 'Tidjane Salaun', pos: 'SF', age: 20, ovr: 68, pot: 83, salary: 5.0, years: 3 },
    { name: 'Tre Mann', pos: 'SG', age: 24, ovr: 72, pot: 76, salary: 9.0, years: 2 },
    { name: 'Moussa Diabate', pos: 'C', age: 23, ovr: 66, pot: 74, salary: 3.0, years: 2 },
    { name: 'Liam McNeeley', pos: 'SF', age: 19, ovr: 64, pot: 81, salary: 4.5, years: 3 },
    { name: 'Ryan Kalkbrenner', pos: 'C', age: 23, ovr: 63, pot: 73, salary: 2.5, years: 2 },
  ],

  // t13 - Miami Heat
  t13: [
    { name: 'Bam Adebayo', pos: 'C', age: 28, ovr: 88, pot: 89, salary: 32.5, years: 3 },
    { name: 'Tyler Herro', pos: 'SG', age: 26, ovr: 84, pot: 86, salary: 30.0, years: 3 },
    { name: 'Norman Powell', pos: 'SF', age: 32, ovr: 79, pot: 79, salary: 22.0, years: 2 },
    { name: 'Andrew Wiggins', pos: 'SF', age: 30, ovr: 79, pot: 80, salary: 24.0, years: 2 },
    { name: "Kel'el Ware", pos: 'C', age: 21, ovr: 73, pot: 84, salary: 5.5, years: 3 },
    { name: 'Jaime Jaquez Jr.', pos: 'SF', age: 24, ovr: 74, pot: 79, salary: 7.0, years: 2 },
    { name: 'Davion Mitchell', pos: 'PG', age: 27, ovr: 71, pot: 73, salary: 9.0, years: 2 },
    { name: 'Kasparas Jakucionis', pos: 'PG', age: 20, ovr: 68, pot: 82, salary: 4.5, years: 3 },
    { name: 'Nikola Jovic', pos: 'PF', age: 22, ovr: 72, pot: 80, salary: 5.0, years: 2 },
    { name: 'Pelle Larsson', pos: 'SG', age: 23, ovr: 64, pot: 73, salary: 2.0, years: 2 },
    { name: 'Dru Smith', pos: 'PG', age: 26, ovr: 66, pot: 70, salary: 2.0, years: 1 },
    { name: 'Isaiah Stevens', pos: 'PG', age: 23, ovr: 63, pot: 71, salary: 1.5, years: 2 },
  ],

  // t14 - Orlando Magic
  t14: [
    { name: 'Paolo Banchero', pos: 'PF', age: 23, ovr: 89, pot: 94, salary: 30.0, years: 4 },
    { name: 'Franz Wagner', pos: 'SF', age: 24, ovr: 87, pot: 91, salary: 22.0, years: 4 },
    { name: 'Desmond Bane', pos: 'SG', age: 27, ovr: 83, pot: 84, salary: 30.0, years: 3 },
    { name: 'Jalen Suggs', pos: 'PG', age: 24, ovr: 79, pot: 84, salary: 14.0, years: 3 },
    { name: 'Jonathan Isaac', pos: 'PF', age: 28, ovr: 75, pot: 77, salary: 17.5, years: 2 },
    { name: 'Moritz Wagner', pos: 'C', age: 28, ovr: 74, pot: 76, salary: 15.0, years: 2 },
    { name: 'Anthony Black', pos: 'PG', age: 21, ovr: 71, pot: 82, salary: 6.5, years: 3 },
    { name: 'Wendell Carter Jr.', pos: 'C', age: 26, ovr: 76, pot: 78, salary: 14.0, years: 2 },
    { name: 'Goga Bitadze', pos: 'C', age: 26, ovr: 71, pot: 74, salary: 9.0, years: 2 },
    { name: 'Tristan da Silva', pos: 'SF', age: 24, ovr: 69, pot: 77, salary: 4.0, years: 3 },
    { name: 'Jase Richardson', pos: 'SG', age: 19, ovr: 64, pot: 80, salary: 3.5, years: 3 },
    { name: 'Jamal Cain', pos: 'SF', age: 26, ovr: 65, pot: 69, salary: 2.0, years: 1 },
  ],

  // t15 - Washington Wizards
  t15: [
    { name: 'Anthony Davis', pos: 'C', age: 32, ovr: 93, pot: 93, salary: 43.0, years: 2 },
    { name: 'Trae Young', pos: 'PG', age: 27, ovr: 88, pot: 89, salary: 43.0, years: 3 },
    { name: "D'Angelo Russell", pos: 'PG', age: 29, ovr: 80, pot: 81, salary: 18.0, years: 1 },
    { name: 'Alexandre Sarr', pos: 'C', age: 20, ovr: 74, pot: 90, salary: 10.5, years: 3 },
    { name: 'Bilal Coulibaly', pos: 'SF', age: 21, ovr: 75, pot: 86, salary: 7.0, years: 3 },
    { name: 'Tre Johnson', pos: 'SG', age: 20, ovr: 72, pot: 86, salary: 8.5, years: 3 },
    { name: 'Cam Whitmore', pos: 'SF', age: 22, ovr: 74, pot: 83, salary: 6.0, years: 3 },
    { name: 'Kyshawn George', pos: 'SG', age: 22, ovr: 68, pot: 79, salary: 4.0, years: 2 },
    { name: 'Jaden Hardy', pos: 'SG', age: 23, ovr: 68, pot: 77, salary: 3.0, years: 2 },
    { name: 'Will Riley', pos: 'SF', age: 20, ovr: 65, pot: 80, salary: 3.5, years: 3 },
    { name: 'Carlton Carrington', pos: 'PG', age: 22, ovr: 67, pot: 78, salary: 3.5, years: 2 },
    { name: 'Nikola Vukcevic', pos: 'C', age: 23, ovr: 64, pot: 74, salary: 2.0, years: 2 },
  ],

  // t16 - Denver Nuggets
  t16: [
    { name: 'Nikola Jokic', pos: 'C', age: 30, ovr: 99, pot: 99, salary: 51.0, years: 3 },
    { name: 'Jamal Murray', pos: 'PG', age: 28, ovr: 87, pot: 88, salary: 34.0, years: 3 },
    { name: 'Aaron Gordon', pos: 'PF', age: 30, ovr: 80, pot: 80, salary: 22.0, years: 2 },
    { name: 'Cam Johnson', pos: 'SF', age: 29, ovr: 79, pot: 80, salary: 26.0, years: 3 },
    { name: 'Christian Braun', pos: 'SG', age: 25, ovr: 76, pot: 80, salary: 8.0, years: 3 },
    { name: 'Jonas Valanciunas', pos: 'C', age: 34, ovr: 75, pot: 75, salary: 10.0, years: 1 },
    { name: 'Tim Hardaway Jr.', pos: 'SG', age: 33, ovr: 72, pot: 72, salary: 12.0, years: 1 },
    { name: 'Julian Strawther', pos: 'SF', age: 24, ovr: 71, pot: 77, salary: 4.5, years: 2 },
    { name: 'Peyton Watson', pos: 'SF', age: 23, ovr: 70, pot: 78, salary: 4.0, years: 2 },
    { name: 'Zeke Nnaji', pos: 'PF', age: 25, ovr: 69, pot: 73, salary: 4.5, years: 2 },
    { name: 'DaRon Holmes II', pos: 'PF', age: 22, ovr: 70, pot: 81, salary: 5.5, years: 3 },
    { name: 'KJ Simpson', pos: 'PG', age: 23, ovr: 66, pot: 74, salary: 2.0, years: 2 },
  ],

  // t17 - Minnesota Timberwolves
  t17: [
    { name: 'Anthony Edwards', pos: 'SG', age: 24, ovr: 95, pot: 97, salary: 40.0, years: 4 },
    { name: 'Julius Randle', pos: 'PF', age: 31, ovr: 83, pot: 83, salary: 29.0, years: 2 },
    { name: 'Rudy Gobert', pos: 'C', age: 33, ovr: 82, pot: 82, salary: 41.0, years: 1 },
    { name: 'Donte DiVincenzo', pos: 'SG', age: 28, ovr: 78, pot: 79, salary: 13.0, years: 2 },
    { name: 'Jaden McDaniels', pos: 'SF', age: 25, ovr: 79, pot: 83, salary: 18.0, years: 3 },
    { name: 'Naz Reid', pos: 'C', age: 26, ovr: 78, pot: 80, salary: 14.0, years: 3 },
    { name: 'Ayo Dosunmu', pos: 'PG', age: 26, ovr: 75, pot: 78, salary: 11.0, years: 2 },
    { name: 'Terrence Shannon Jr.', pos: 'SG', age: 24, ovr: 73, pot: 78, salary: 5.5, years: 2 },
    { name: 'Jaylen Clark', pos: 'SG', age: 24, ovr: 70, pot: 76, salary: 3.5, years: 2 },
    { name: 'Bones Hyland', pos: 'PG', age: 25, ovr: 72, pot: 75, salary: 8.0, years: 2 },
    { name: 'Mike Conley', pos: 'PG', age: 38, ovr: 68, pot: 68, salary: 6.0, years: 1 },
    { name: 'Kyle Anderson', pos: 'PF', age: 32, ovr: 69, pot: 69, salary: 5.5, years: 1 },
  ],

  // t18 - Oklahoma City Thunder
  t18: [
    { name: 'Shai Gilgeous-Alexander', pos: 'PG', age: 27, ovr: 97, pot: 98, salary: 35.0, years: 4 },
    { name: 'Jalen Williams', pos: 'SG', age: 24, ovr: 89, pot: 93, salary: 25.0, years: 4 },
    { name: 'Chet Holmgren', pos: 'C', age: 23, ovr: 86, pot: 91, salary: 9.5, years: 3 },
    { name: 'Luguentz Dort', pos: 'SG', age: 26, ovr: 79, pot: 80, salary: 16.0, years: 3 },
    { name: 'Alex Caruso', pos: 'PG', age: 31, ovr: 78, pot: 78, salary: 13.0, years: 2 },
    { name: 'Isaiah Hartenstein', pos: 'C', age: 27, ovr: 79, pot: 81, salary: 16.0, years: 3 },
    { name: 'Isaiah Joe', pos: 'SG', age: 25, ovr: 72, pot: 75, salary: 7.5, years: 2 },
    { name: 'Nikola Topic', pos: 'PG', age: 20, ovr: 71, pot: 88, salary: 5.5, years: 3 },
    { name: 'Aaron Wiggins', pos: 'SG', age: 26, ovr: 71, pot: 74, salary: 5.0, years: 2 },
    { name: 'Kenrich Williams', pos: 'SF', age: 30, ovr: 70, pot: 70, salary: 7.0, years: 1 },
    { name: 'Ajay Mitchell', pos: 'SG', age: 22, ovr: 67, pot: 77, salary: 3.5, years: 3 },
    { name: 'Cason Wallace', pos: 'PG', age: 22, ovr: 69, pot: 79, salary: 5.0, years: 3 },
  ],

  // t19 - Portland Trail Blazers
  t19: [
    { name: 'Damian Lillard', pos: 'PG', age: 35, ovr: 88, pot: 88, salary: 46.0, years: 2 },
    { name: 'Deni Avdija', pos: 'SF', age: 24, ovr: 82, pot: 87, salary: 19.0, years: 3 },
    { name: 'Donovan Clingan', pos: 'C', age: 21, ovr: 76, pot: 88, salary: 7.5, years: 3 },
    { name: 'Jrue Holiday', pos: 'PG', age: 35, ovr: 79, pot: 79, salary: 36.0, years: 1 },
    { name: 'Jerami Grant', pos: 'PF', age: 31, ovr: 78, pot: 78, salary: 21.0, years: 2 },
    { name: 'Scoot Henderson', pos: 'PG', age: 21, ovr: 75, pot: 89, salary: 8.5, years: 3 },
    { name: 'Shaedon Sharpe', pos: 'SG', age: 22, ovr: 76, pot: 87, salary: 7.5, years: 3 },
    { name: 'Robert Williams III', pos: 'C', age: 28, ovr: 74, pot: 76, salary: 13.0, years: 2 },
    { name: 'Toumani Camara', pos: 'SF', age: 24, ovr: 72, pot: 78, salary: 5.0, years: 2 },
    { name: 'Kris Murray', pos: 'PF', age: 24, ovr: 70, pot: 76, salary: 4.5, years: 2 },
    { name: 'Matisse Thybulle', pos: 'SG', age: 28, ovr: 70, pot: 71, salary: 9.0, years: 1 },
    { name: 'Caleb Love', pos: 'PG', age: 23, ovr: 66, pot: 74, salary: 2.0, years: 2 },
  ],

  // t20 - Utah Jazz
  t20: [
    { name: 'Lauri Markkanen', pos: 'PF', age: 28, ovr: 86, pot: 87, salary: 22.0, years: 3 },
    { name: 'Jaren Jackson Jr.', pos: 'PF', age: 26, ovr: 85, pot: 87, salary: 32.0, years: 3 },
    { name: 'Walker Kessler', pos: 'C', age: 24, ovr: 78, pot: 84, salary: 8.5, years: 3 },
    { name: 'Keyonte George', pos: 'PG', age: 22, ovr: 74, pot: 84, salary: 6.5, years: 3 },
    { name: 'Isaiah Collier', pos: 'PG', age: 21, ovr: 71, pot: 85, salary: 5.5, years: 3 },
    { name: 'Ace Bailey', pos: 'SF', age: 19, ovr: 70, pot: 88, salary: 8.0, years: 3 },
    { name: 'Cody Williams', pos: 'SF', age: 20, ovr: 68, pot: 85, salary: 6.5, years: 3 },
    { name: 'Brice Sensabaugh', pos: 'SF', age: 22, ovr: 68, pot: 77, salary: 3.5, years: 2 },
    { name: 'Jusuf Nurkic', pos: 'C', age: 31, ovr: 73, pot: 73, salary: 18.0, years: 1 },
    { name: 'Kevin Love', pos: 'PF', age: 37, ovr: 67, pot: 67, salary: 5.0, years: 1 },
    { name: 'Svi Mykhailiuk', pos: 'SG', age: 28, ovr: 67, pot: 68, salary: 3.0, years: 1 },
    { name: 'Kennedy Chandler', pos: 'PG', age: 22, ovr: 67, pot: 78, salary: 2.5, years: 2 },
  ],

  // t21 - Golden State Warriors
  t21: [
    { name: 'Stephen Curry', pos: 'PG', age: 37, ovr: 93, pot: 93, salary: 55.0, years: 1 },
    { name: 'Jimmy Butler', pos: 'SF', age: 36, ovr: 86, pot: 86, salary: 48.0, years: 2 },
    { name: 'Draymond Green', pos: 'PF', age: 35, ovr: 81, pot: 81, salary: 22.0, years: 1 },
    { name: 'Kristaps Porzingis', pos: 'C', age: 30, ovr: 82, pot: 82, salary: 30.0, years: 2 },
    { name: 'Brandin Podziemski', pos: 'SG', age: 23, ovr: 77, pot: 84, salary: 5.0, years: 3 },
    { name: 'Moses Moody', pos: 'SG', age: 24, ovr: 74, pot: 80, salary: 5.5, years: 3 },
    { name: 'Al Horford', pos: 'C', age: 39, ovr: 71, pot: 71, salary: 26.0, years: 1 },
    { name: 'Gary Payton II', pos: 'PG', age: 32, ovr: 72, pot: 72, salary: 8.5, years: 1 },
    { name: "De'Anthony Melton", pos: 'SG', age: 27, ovr: 73, pot: 75, salary: 9.0, years: 2 },
    { name: 'Seth Curry', pos: 'SG', age: 35, ovr: 71, pot: 71, salary: 8.0, years: 1 },
    { name: 'Quinten Post', pos: 'C', age: 24, ovr: 67, pot: 74, salary: 2.5, years: 2 },
    { name: 'Pat Spencer', pos: 'PG', age: 29, ovr: 63, pot: 65, salary: 1.8, years: 1 },
  ],

  // t22 - LA Clippers
  t22: [
    { name: 'Kawhi Leonard', pos: 'SF', age: 34, ovr: 89, pot: 89, salary: 48.0, years: 2 },
    { name: 'Darius Garland', pos: 'PG', age: 26, ovr: 85, pot: 87, salary: 36.0, years: 3 },
    { name: 'Bradley Beal', pos: 'SG', age: 32, ovr: 82, pot: 82, salary: 50.0, years: 2 },
    { name: 'John Collins', pos: 'PF', age: 28, ovr: 79, pot: 80, salary: 26.0, years: 2 },
    { name: 'Bennedict Mathurin', pos: 'SG', age: 23, ovr: 78, pot: 85, salary: 12.0, years: 3 },
    { name: 'Bogdan Bogdanovic', pos: 'SG', age: 33, ovr: 77, pot: 77, salary: 18.0, years: 1 },
    { name: 'Brook Lopez', pos: 'C', age: 37, ovr: 75, pot: 75, salary: 14.0, years: 1 },
    { name: 'Derrick Jones Jr.', pos: 'SF', age: 28, ovr: 73, pot: 74, salary: 9.0, years: 2 },
    { name: 'TyTy Washington Jr.', pos: 'PG', age: 23, ovr: 72, pot: 80, salary: 7.0, years: 2 },
    { name: 'Kris Dunn', pos: 'PG', age: 31, ovr: 70, pot: 70, salary: 7.5, years: 1 },
    { name: 'Nicolas Batum', pos: 'SF', age: 37, ovr: 67, pot: 67, salary: 6.0, years: 1 },
    { name: 'Cam Christie', pos: 'SG', age: 21, ovr: 67, pot: 79, salary: 3.5, years: 3 },
  ],

  // t23 - Los Angeles Lakers
  t23: [
    { name: 'Luka Doncic', pos: 'PG', age: 26, ovr: 97, pot: 98, salary: 46.0, years: 4 },
    { name: 'LeBron James', pos: 'SF', age: 41, ovr: 87, pot: 87, salary: 47.6, years: 1 },
    { name: 'Deandre Ayton', pos: 'C', age: 27, ovr: 82, pot: 83, salary: 33.0, years: 2 },
    { name: 'Austin Reaves', pos: 'SG', age: 27, ovr: 80, pot: 82, salary: 24.0, years: 3 },
    { name: 'Marcus Smart', pos: 'PG', age: 31, ovr: 75, pot: 75, salary: 16.0, years: 2 },
    { name: 'Rui Hachimura', pos: 'PF', age: 27, ovr: 76, pot: 77, salary: 18.0, years: 2 },
    { name: 'Dalton Knecht', pos: 'SG', age: 24, ovr: 73, pot: 80, salary: 4.5, years: 3 },
    { name: 'Jarred Vanderbilt', pos: 'PF', age: 26, ovr: 72, pot: 74, salary: 13.5, years: 2 },
    { name: 'Maxi Kleber', pos: 'PF', age: 33, ovr: 70, pot: 70, salary: 9.0, years: 1 },
    { name: 'Jake LaRavia', pos: 'SF', age: 24, ovr: 70, pot: 77, salary: 6.5, years: 2 },
    { name: 'Jaxson Hayes', pos: 'C', age: 27, ovr: 70, pot: 73, salary: 9.0, years: 2 },
    { name: 'Bronny James', pos: 'SG', age: 21, ovr: 64, pot: 74, salary: 3.0, years: 2 },
  ],

  // t24 - Phoenix Suns
  t24: [
    { name: 'Devin Booker', pos: 'SG', age: 29, ovr: 92, pot: 92, salary: 36.0, years: 3 },
    { name: 'Jalen Green', pos: 'SG', age: 23, ovr: 85, pot: 90, salary: 33.0, years: 3 },
    { name: 'Mark Williams', pos: 'C', age: 23, ovr: 76, pot: 84, salary: 10.0, years: 3 },
    { name: 'Dillon Brooks', pos: 'SF', age: 29, ovr: 75, pot: 75, salary: 21.0, years: 2 },
    { name: 'Grayson Allen', pos: 'SG', age: 30, ovr: 74, pot: 75, salary: 10.0, years: 2 },
    { name: 'Ryan Dunn', pos: 'SF', age: 23, ovr: 72, pot: 82, salary: 5.0, years: 3 },
    { name: "Royce O'Neale", pos: 'SF', age: 32, ovr: 72, pot: 72, salary: 9.5, years: 1 },
    { name: 'Haywood Highsmith', pos: 'SF', age: 28, ovr: 69, pot: 71, salary: 8.0, years: 2 },
    { name: 'Oso Ighodaro', pos: 'C', age: 23, ovr: 67, pot: 77, salary: 3.5, years: 3 },
    { name: 'Khaman Maluach', pos: 'C', age: 19, ovr: 65, pot: 84, salary: 4.5, years: 3 },
    { name: 'Amir Coffey', pos: 'SG', age: 28, ovr: 68, pot: 70, salary: 4.0, years: 1 },
    { name: 'Jordan Goodwin', pos: 'PG', age: 26, ovr: 65, pot: 69, salary: 2.5, years: 1 },
  ],

  // t25 - Sacramento Kings
  t25: [
    { name: 'Domantas Sabonis', pos: 'C', age: 29, ovr: 88, pot: 89, salary: 37.0, years: 3 },
    { name: 'Zach LaVine', pos: 'SG', age: 30, ovr: 85, pot: 85, salary: 43.0, years: 2 },
    { name: 'DeMar DeRozan', pos: 'SG', age: 36, ovr: 83, pot: 83, salary: 26.0, years: 1 },
    { name: "De'Andre Hunter", pos: 'SF', age: 27, ovr: 79, pot: 81, salary: 22.0, years: 2 },
    { name: 'Keegan Murray', pos: 'PF', age: 25, ovr: 78, pot: 82, salary: 13.0, years: 3 },
    { name: 'Malik Monk', pos: 'PG', age: 27, ovr: 77, pot: 78, salary: 18.0, years: 2 },
    { name: 'Precious Achiuwa', pos: 'PF', age: 26, ovr: 73, pot: 77, salary: 8.5, years: 2 },
    { name: 'Russell Westbrook', pos: 'PG', age: 37, ovr: 70, pot: 70, salary: 3.0, years: 1 },
    { name: 'Devin Carter', pos: 'SG', age: 22, ovr: 69, pot: 80, salary: 4.5, years: 3 },
    { name: 'Doug McDermott', pos: 'SF', age: 34, ovr: 69, pot: 69, salary: 5.0, years: 1 },
    { name: 'Maxime Raynaud', pos: 'C', age: 23, ovr: 67, pot: 77, salary: 2.5, years: 2 },
    { name: 'Nique Clifford', pos: 'SF', age: 23, ovr: 65, pot: 73, salary: 2.0, years: 2 },
  ],

  // t26 - Dallas Mavericks
  t26: [
    { name: 'Kyrie Irving', pos: 'PG', age: 33, ovr: 88, pot: 88, salary: 39.0, years: 2 },
    { name: 'Cooper Flagg', pos: 'PF', age: 19, ovr: 79, pot: 96, salary: 10.5, years: 4 },
    { name: 'Klay Thompson', pos: 'SG', age: 35, ovr: 79, pot: 79, salary: 22.0, years: 2 },
    { name: 'Khris Middleton', pos: 'SF', age: 34, ovr: 78, pot: 78, salary: 20.0, years: 1 },
    { name: 'Daniel Gafford', pos: 'C', age: 27, ovr: 78, pot: 80, salary: 21.0, years: 3 },
    { name: 'PJ Washington', pos: 'PF', age: 27, ovr: 76, pot: 78, salary: 16.5, years: 3 },
    { name: 'Dereck Lively II', pos: 'C', age: 21, ovr: 74, pot: 85, salary: 7.0, years: 3 },
    { name: 'Naji Marshall', pos: 'SF', age: 28, ovr: 73, pot: 75, salary: 9.0, years: 2 },
    { name: 'Caleb Martin', pos: 'SF', age: 29, ovr: 73, pot: 74, salary: 9.0, years: 2 },
    { name: 'Max Christie', pos: 'SG', age: 23, ovr: 71, pot: 78, salary: 4.5, years: 2 },
    { name: 'Ryan Nembhard', pos: 'PG', age: 23, ovr: 70, pot: 79, salary: 4.0, years: 2 },
    { name: 'AJ Johnson', pos: 'PG', age: 21, ovr: 67, pot: 81, salary: 4.5, years: 3 },
  ],

  // t27 - Houston Rockets
  t27: [
    { name: 'Kevin Durant', pos: 'SF', age: 37, ovr: 91, pot: 91, salary: 51.0, years: 2 },
    { name: 'Alperen Sengun', pos: 'C', age: 23, ovr: 88, pot: 93, salary: 18.0, years: 4 },
    { name: 'Jabari Smith Jr.', pos: 'PF', age: 23, ovr: 79, pot: 86, salary: 10.0, years: 3 },
    { name: 'Amen Thompson', pos: 'SG', age: 22, ovr: 78, pot: 88, salary: 9.0, years: 3 },
    { name: 'Fred VanVleet', pos: 'PG', age: 32, ovr: 77, pot: 77, salary: 43.0, years: 2 },
    { name: 'Reed Sheppard', pos: 'PG', age: 22, ovr: 73, pot: 85, salary: 7.5, years: 3 },
    { name: 'Tari Eason', pos: 'PF', age: 24, ovr: 74, pot: 80, salary: 7.0, years: 2 },
    { name: 'Dorian Finney-Smith', pos: 'SF', age: 32, ovr: 72, pot: 72, salary: 13.0, years: 2 },
    { name: 'Clint Capela', pos: 'C', age: 31, ovr: 75, pot: 75, salary: 18.0, years: 1 },
    { name: 'Steven Adams', pos: 'C', age: 32, ovr: 70, pot: 70, salary: 14.5, years: 1 },
    { name: 'Aaron Holiday', pos: 'PG', age: 29, ovr: 68, pot: 69, salary: 4.5, years: 1 },
    { name: 'Tristen Newton', pos: 'PG', age: 26, ovr: 67, pot: 72, salary: 2.5, years: 2 },
  ],

  // t28 - Memphis Grizzlies
  t28: [
    { name: 'Ja Morant', pos: 'PG', age: 26, ovr: 91, pot: 93, salary: 35.0, years: 4 },
    { name: 'Zach Edey', pos: 'C', age: 23, ovr: 76, pot: 84, salary: 7.5, years: 3 },
    { name: 'GG Jackson', pos: 'PF', age: 21, ovr: 75, pot: 86, salary: 6.5, years: 3 },
    { name: 'Santi Aldama', pos: 'PF', age: 24, ovr: 74, pot: 79, salary: 10.0, years: 2 },
    { name: 'Kentavious Caldwell-Pope', pos: 'SG', age: 33, ovr: 72, pot: 72, salary: 8.0, years: 1 },
    { name: 'Ty Jerome', pos: 'PG', age: 28, ovr: 73, pot: 74, salary: 9.0, years: 2 },
    { name: 'Scotty Pippen Jr.', pos: 'PG', age: 25, ovr: 71, pot: 76, salary: 5.0, years: 2 },
    { name: 'Taylor Hendricks', pos: 'PF', age: 22, ovr: 70, pot: 82, salary: 5.5, years: 3 },
    { name: 'Jaylen Wells', pos: 'SF', age: 23, ovr: 70, pot: 77, salary: 3.5, years: 2 },
    { name: 'Olivier-Maxence Prosper', pos: 'SF', age: 23, ovr: 69, pot: 76, salary: 4.0, years: 2 },
    { name: 'Rayan Rupert', pos: 'SG', age: 21, ovr: 67, pot: 78, salary: 3.0, years: 3 },
    { name: 'Walter Clayton Jr.', pos: 'PG', age: 23, ovr: 68, pot: 77, salary: 4.0, years: 3 },
  ],

  // t29 - New Orleans Pelicans
  t29: [
    { name: 'Zion Williamson', pos: 'PF', age: 25, ovr: 88, pot: 90, salary: 35.0, years: 3 },
    { name: 'Dejounte Murray', pos: 'PG', age: 29, ovr: 84, pot: 85, salary: 28.0, years: 2 },
    { name: 'Trey Murphy III', pos: 'SF', age: 25, ovr: 79, pot: 83, salary: 20.0, years: 3 },
    { name: 'Jordan Poole', pos: 'SG', age: 27, ovr: 78, pot: 80, salary: 33.0, years: 2 },
    { name: 'Yves Missi', pos: 'C', age: 21, ovr: 72, pot: 84, salary: 5.0, years: 3 },
    { name: 'Herbert Jones', pos: 'SF', age: 27, ovr: 74, pot: 77, salary: 14.0, years: 2 },
    { name: 'Jordan Hawkins', pos: 'SG', age: 23, ovr: 71, pot: 79, salary: 4.5, years: 3 },
    { name: 'Jeremiah Fears', pos: 'PG', age: 19, ovr: 68, pot: 87, salary: 6.5, years: 3 },
    { name: 'Hunter Dickinson', pos: 'C', age: 24, ovr: 71, pot: 76, salary: 4.0, years: 2 },
    { name: 'Saddiq Bey', pos: 'SF', age: 26, ovr: 71, pot: 74, salary: 7.5, years: 2 },
    { name: 'Trey Alexander', pos: 'PG', age: 23, ovr: 67, pot: 75, salary: 2.5, years: 2 },
    { name: 'Derik Queen', pos: 'C', age: 21, ovr: 65, pot: 78, salary: 4.0, years: 3 },
  ],

  // t30 - San Antonio Spurs
  t30: [
    { name: 'Victor Wembanyama', pos: 'C', age: 21, ovr: 94, pot: 99, salary: 13.0, years: 3 },
    { name: "De'Aaron Fox", pos: 'PG', age: 28, ovr: 87, pot: 88, salary: 28.0, years: 3 },
    { name: 'Stephon Castle', pos: 'PG', age: 21, ovr: 76, pot: 89, salary: 8.5, years: 3 },
    { name: 'Devin Vassell', pos: 'SG', age: 25, ovr: 79, pot: 82, salary: 21.0, years: 3 },
    { name: 'Dylan Harper', pos: 'PG', age: 19, ovr: 74, pot: 92, salary: 10.0, years: 4 },
    { name: 'Harrison Barnes', pos: 'SF', age: 33, ovr: 74, pot: 74, salary: 16.0, years: 1 },
    { name: 'Keldon Johnson', pos: 'SF', age: 26, ovr: 74, pot: 76, salary: 16.5, years: 2 },
    { name: 'Kelly Olynyk', pos: 'C', age: 34, ovr: 70, pot: 70, salary: 10.0, years: 1 },
    { name: 'Julian Champagnie', pos: 'SF', age: 24, ovr: 69, pot: 75, salary: 4.5, years: 2 },
    { name: 'Luke Kornet', pos: 'C', age: 29, ovr: 68, pot: 69, salary: 5.0, years: 1 },
    { name: 'Harrison Ingram', pos: 'SF', age: 23, ovr: 66, pot: 75, salary: 2.8, years: 2 },
    { name: 'Lindy Waters III', pos: 'SG', age: 28, ovr: 65, pot: 67, salary: 2.0, years: 1 },
  ],
};
