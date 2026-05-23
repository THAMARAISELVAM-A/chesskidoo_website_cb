/* assets/js/pgn-library.js
   ChessKidoo Famous Games PGN Library
   Curated educational and historical games organized level-by-level: Beginner, Intermediate, Advanced, and Elite. */

window.CK = window.CK || {};

CK.pgnLibrary = {

  activeLevels: {},

  games: [
    // --- BEGINNER ---
    {
      id: 'fools_mate',
      level: 'Beginner',
      title: "Fool's Mate",
      white: 'Amateur White',
      black: 'Amateur Black',
      year: 'Classic',
      event: 'Instructional Example',
      category: 'King Safety',
      badge: 'p-badge-red',
      icon: '⚠️',
      why: 'The quickest possible checkmate in chess. Demonstrates why exposing the King too early with weak pawn pushes (f4 and g4) is fatal.',
      pgn: '1. f4 e6 2. g4 Qh4#'
    },
    {
      id: 'scholars_mate',
      level: 'Beginner',
      title: "Scholar's Mate",
      white: 'Beginner White',
      black: 'Beginner Black',
      year: 'Classic',
      event: 'Instructional Example',
      category: 'Mating Patterns',
      badge: 'p-badge-gold',
      icon: '🎓',
      why: 'The classic four-move checkmate targeting the weak f7 square. Learn how to execute it and, more importantly, how to defend against it!',
      pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#'
    },
    {
      id: 'queens_mate',
      level: 'Beginner',
      title: 'Queen Mate Mechanics',
      white: 'Teacher',
      black: 'Student',
      year: 'Lesson',
      event: 'Instructional Example',
      category: 'Basic Endgames',
      badge: 'p-badge-blue',
      icon: '♛',
      why: 'Fast development leading to queen-dominated mate. Teaches the power of coordinates and controlling squares.',
      pgn: '1. e4 e5 2. Bc4 Nf6 3. d4 exd4 4. Nf3 Nxe4 5. Qxd4 Nd6 6. O-O Be7 7. Qxg7 Bf6 8. Re1+'
    },
    {
      id: 'castling_basics',
      level: 'Beginner',
      title: 'Castling Basics',
      white: 'Coach',
      black: 'Student',
      year: 'Lesson',
      event: 'Instructional Example',
      category: 'Fundamentals',
      badge: 'p-badge-teal',
      icon: '🏰',
      why: 'Demonstrates the importance of castling early to secure king safety and bring the rook into active play.',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O Bc5 5. Re1 O-O'
    },
    {
      id: 'back_rank_basics',
      level: 'Beginner',
      title: 'Back-Rank Mate',
      white: 'Morphy',
      black: 'Consultants',
      year: '1858',
      event: 'Paris Exhibition',
      category: 'Tactics',
      badge: 'p-badge-green',
      icon: '♜',
      why: 'A clean demonstration of the back-rank checkmate pattern. The king is trapped by its own pawns.',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Nf6 5. Nxc6 bxc6 6. Bd3 d5 7. exd5 cxd5 8. O-O Be7 9. Re1 O-O 10. Bg5 h6 11. Bh4 c6 12. Nd2 Be6 13. Nf3 Nd7 14. Bxe7 Qe7 15. Nd4 Qd6 16. Nxe6 fxe6 17. Qg4 Rf6 18. Re3 Ne5 19. Qg3 Nf7 20. Rae1 e5 21. f3 Rf8 22. c3 Qc5 23. Kh1 e4 24. fxe4 Ng5 25. e5 Rf2 26. e6 Qe7 27. h4 Ne4 28. Bxe4 dxe4 29. Rxe4 Rxb2 30. Rd4 Rd8 31. Rxd8+ Qxd8 32. e7 Qe8 33. Qd6 Rf2 34. Qe6+ Kh8 35. Rd1 Rf6 36. Rd8 Rxe6 37. Rxe8+ Kh7 38. h5'
    },

    // --- INTERMEDIATE ---
    {
      id: 'evans_gambit',
      level: 'Intermediate',
      title: 'Evans Gambit Attack',
      white: 'Paul Morphy',
      black: 'Adolf Anderssen',
      year: 1858,
      event: 'Paris Match',
      category: 'Gambits',
      badge: 'p-badge-gold',
      icon: '⚔️',
      why: 'Sacrificing the b-pawn to gain central space, rapid piece development, and a strong attack. A perfect romantic-era chess lesson.',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O Nge7 8. cxd4 d5 9. exd5 Nxd5 10. Ba3 Be6 11. Nbd2 Bb4 12. Bxb4 Ndxb4 13. Bxe6 fxe6 14. Qb3 O-O 15. Qxe6+ Kh8 16. Nb3 Rxf3 17. gxf3 Nxd4 18. Nxd4 Qxd4 19. Qe4 Qd6 20. Rfd1 Qf8 21. Qxb7 Re8 22. Qxc7 Nd5 23. Rxd5'
    },
    {
      id: 'caro_kann',
      level: 'Intermediate',
      title: 'Caro-Kann Defence',
      white: 'Grandmaster',
      black: 'ChessKidoo Bot',
      year: 2026,
      event: 'Academy Sparring',
      category: 'Openings',
      badge: 'p-badge-teal',
      icon: '🛡️',
      why: 'Solid positional safety. Black challenges the center with d5 while maintaining a clean pawn structure and active light-squared bishop.',
      pgn: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7 8. h5 Bh7 9. Bd3 Bxd3 10. Qxd3 Ngf6 11. Bf4 Qa5+ 12. Bd2 Qc7 13. O-O-O e6 14. Ne4 Nxe4 15. Qxe4 Nf6 16. Qe2 Bd6 17. g3 O-O-O'
    },
    {
      id: 'knight_fork_brilliance',
      level: 'Intermediate',
      title: 'Knight Fork Brilliancy',
      white: 'Tactician',
      black: 'Defender',
      year: 'Modern',
      event: 'Tactical Practice',
      category: 'Tactics',
      badge: 'p-badge-blue',
      icon: '♞',
      why: 'Demonstrates intermediate tactical combinations using L-shaped knight jumps to fork multiple heavy pieces simultaneously.',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Nxe4 6. d4 b5 7. Bb3 d5 8. dxe5 Be6 9. c3 Bc5 10. Nbd2 O-O 11. Bc2 f5 12. Nb3 Bb6 13. Nfd4 Nxd4 14. Nxd4 Bxd4 15. cxd4 f4 16. f3 Ng3 17. hxg3 fxg3 18. Qd3 Bf5 19. Qxf5 Rxf5 20. Bxf5 Qh4 21. Bh3 Qxd4+ 22. Kh1 Qxe5'
    },
    {
      id: 'smothered_mate_pattern',
      level: 'Intermediate',
      title: 'Smothered Mate Pattern',
      white: 'Attacking Player',
      black: 'Boxed King',
      year: 'Classic',
      event: 'Pattern Study',
      category: 'Mating Patterns',
      badge: 'p-badge-red',
      icon: '🐴',
      why: 'A beautiful pattern where the enemy King is completely suffocated by its own pieces, allowing a knight to deliver a smothered checkmate.',
      pgn: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e5 6. Ndb5 d6 7. Nd5 Nxd5 8. exd5 Ne7 9. c3 a6 10. Qa4 axb5 11. Qxa8'
    },
    {
      id: 'opera',
      level: 'Intermediate',
      title: 'The Opera Game',
      white: 'Paul Morphy',
      black: 'Duke & Count',
      year: 1858,
      event: 'Paris Opera House',
      category: 'Tactical Brilliance',
      badge: 'p-badge-gold',
      icon: '♛',
      why: 'Morphy sacrifices a rook and bishop to deliver a stunning back-rank smothered mate in just 17 moves. The perfect lesson in piece activity.',
      pgn: '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#'
    },

    // --- ADVANCED ---
    {
      id: 'immortal',
      level: 'Advanced',
      title: 'The Immortal Game',
      white: 'Adolf Anderssen',
      black: 'Lionel Kieseritzky',
      year: 1851,
      event: 'London Casual',
      category: 'Attacking Play',
      badge: 'p-badge-red',
      icon: '♚',
      why: 'Anderssen sacrifices both rooks, a bishop, and then his queen to deliver checkmate with his minor pieces alone. The ultimate attacking chess game.',
      pgn: '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#'
    },
    {
      id: 'morphy_paulsen',
      level: 'Advanced',
      title: 'Morphy vs Paulsen',
      white: 'Paul Morphy',
      black: 'Louis Paulsen',
      year: 1857,
      event: '1st American Congress',
      category: 'Queen Sacrifice',
      badge: 'p-badge-yellow',
      icon: '♗',
      why: 'Morphy sacrifices his queen on move 17. A classic demonstration of positional compensation and attacking geometry.',
      pgn: '1. e4 c5 2. d4 cxd4 3. Nf3 Nc6 4. Nxd4 e6 5. Nb5 d6 6. Bf4 e5 7. Be3 f5 8. N1c3 f4 9. Nd5 fxe3 10. Nbc7+ Kf7 11. Qf3+ Nf6 12. Bc4 Nd4 13. Nxf6+ Nxf3+ 14. Ke2 Qd7 15. Nxd7 Nd4+ 16. Kd3 Nb5+ 17. Kc2 Nxc7 18. Nxe5+ dxe5 19. gxf3 Bd7 20. Rhg1 g6 21. Rxg6 hxg6 22. Rxg6 Ke7 23. Rxg7+ Ke8 24. Rg8+ Kf7 25. Rxf8#'
    },
    {
      id: 'tal_bronstein',
      level: 'Advanced',
      title: 'Tal vs Bronstein',
      white: 'Mikhail Tal',
      black: 'David Bronstein',
      year: 1982,
      event: 'USSR Championship',
      category: 'Tactical Attack',
      badge: 'p-badge-red',
      icon: '♜',
      why: 'Tal launches a ferocious kingside attack and sacrifices material to destroy all defensive resources. Romantic chess meets high-level tactics.',
      pgn: '1. e4 c5 2. Ne2 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. g3 e5 7. Nde2 Be7 8. Bg2 O-O 9. O-O Nbd7 10. h3 b5 11. g4 b4 12. Nd5 Nxd5 13. exd5 Bf6 14. Ng3 a5 15. g5 Be7 16. h4 a4 17. h5 a3 18. h5 a3 19. b3 Nc5 20. g6 hxg6 21. hxg6 f6 22. Bh6 Re8 23. Kh2 Bf8 24. Bxf8 Rxf8 25. Nf5 Bxf5 26. Qh5 Bg6 27. Qxg6 Qe7 28. Rh1 Rf7 29. gxf7+ Kxf7 30. Rh7+ Kf8 31. Qh6+ 1-0'
    },
    {
      id: 'capablanca_tartakower',
      level: 'Advanced',
      title: 'Capablanca vs Tartakower',
      white: 'Jose Raul Capablanca',
      black: 'Savielly Tartakower',
      year: 1924,
      event: 'New York Tournament',
      category: 'Endgame Mastery',
      badge: 'p-badge-green',
      icon: '♖',
      why: 'Capablanca converts a rook endgame that seemed drawish into a clinical win. A landmark study in active rook and active king principles.',
      pgn: '1. d4 e6 2. Nf3 f5 3. c4 Nf6 4. Bg5 Be7 5. Nc3 O-O 6. e3 b6 7. Bd3 Bb7 8. O-O Qe8 9. Qe2 Ne4 10. Bxe7 Qxe7 11. Bxe4 fxe4 12. Nd2 d6 13. f3 exf3 14. Rxf3 Qh4 15. Rf2 Nc6 16. Nde4 Rxf2 17. Qxf2 Rf8 18. Qg3 Qxg3 19. Nxg3 Rf4 20. Nce4 Rg4 21. Nf2 Rf4 22. Nfd3 Rf7 23. Re1 Ne7 24. Kf2 c5 25. b4 cxd4 26. exd4 Kf8 27. bxc5 bxc5 28. dxc5 dxc5 29. c5 Ke8 30. Ke3 Kd7 31. Kd4 Nc6+ 32. Kc4 Nb4 33. Nxb4 Rf4+ 34. Kb3 Rxb4+ 35. Kc3 Rh4 36. Rd1+ Kc7 37. Nge4 Rh3+ 38. Kb2 Rh4 39. Nd6 Rh5 40. Nxe6+ Kb7 41. Rd7+ Ka6 42. Nd4 Rxh2+ 43. Ka3 Rh3+ 44. Nb3 1-0'
    },

    // --- ELITE ---
    {
      id: 'gotc',
      level: 'Elite',
      title: 'Game of the Century',
      white: 'Donald Byrne',
      black: 'Bobby Fischer',
      year: 1956,
      event: 'Rosenwald Trophy',
      category: 'Strategic Brilliance',
      badge: 'p-badge-blue',
      icon: '♞',
      why: 'Fischer, aged 13, sacrifices his queen on move 18 to launch an unstoppable mating attack. A supreme masterclass in piece coordination.',
      pgn: '1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2#'
    },
    {
      id: 'fischer72',
      level: 'Elite',
      title: 'Fischer vs Spassky (G6)',
      white: 'Bobby Fischer',
      black: 'Boris Spassky',
      year: 1972,
      event: 'World Championship',
      category: 'Classic Strategy',
      badge: 'p-badge-teal',
      icon: '♔',
      why: 'Commonly cited as Fischer\'s cleanest game. Positional squeeze and queenside minority attack turned into a kingside execution.',
      pgn: '1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4 Qf8 19. Nxe6 fxe6 20. e4 d4 21. f4 Qe7 22. e5 Rb8 23. Bc4 Kh8 24. Qh3 Nf8 25. b3 a5 26. f5 exf5 27. Rxf5 Nh7 28. Rcf1 Qd8 29. Qg3 Re7 30. h4 Rbb7 31. e6 Rbc7 32. Qe5 Qe8 33. a4 Qd8 34. R1f2 Qe8 35. R2f3 Qd8 36. Bd3 Qe8 37. Qe4 Nf6 38. Rxf6 gxf6 39. Rxf6 Kg8 40. Bc4 Kh8 41. Qf4 1-0'
    },
    {
      id: 'kasparov99',
      level: 'Elite',
      title: "Kasparov's Immortal",
      white: 'Garry Kasparov',
      black: 'Veselin Topalov',
      year: 1999,
      event: 'Hoogeveen Tournament',
      category: 'King Hunt',
      badge: 'p-badge-gold',
      icon: '♕',
      why: 'Kasparov sacrifices a rook on move 24, launching an amazing hunt of the black King from g8 all the way to d1. Unbelievable calculation.',
      pgn: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Qxa3 32. Qxa6+ Kb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0'
    },
    {
      id: 'deep_blue',
      level: 'Elite',
      title: 'Deep Blue vs Kasparov',
      white: 'Deep Blue (IBM)',
      black: 'Garry Kasparov',
      year: 1997,
      event: 'IBM Man-Machine Challenge',
      category: 'Computer Era',
      badge: 'p-badge-red',
      icon: '🤖',
      why: 'The historic game where a computer defeated a reigning classical world champion for the first time in a tournament match.',
      pgn: '1. e4 c5 2. c3 d5 3. exd5 Qxd5 4. d4 Nf6 5. Nf3 Bg4 6. Be2 e6 7. h3 Bh5 8. O-O Nc6 9. Be3 cxd4 10. cxd4 Bb4 11. a3 Ba5 12. Nc3 Qd6 13. Nb5 Qe7 14. Ne5 Bxe2 15. Qxe2 O-O 16. Rac1 Rac8 17. Bg5 Bb6 18. Bxf6 gxf6 19. Nc4 Rfd8 20. Nxb6 axb6 21. Rfd1 f5 22. Qe3 Qf6 23. d5 Rxd5 24. Rxd5 exd5 25. b3 Kh8 26. Qxb6 Rg8 27. Qc5 d4 28. Nd6 f4 29. Nxb7 Ne5 30. Qd5 f3 31. g3 Nd3 32. Rc7 Re8 33. Nd6 Re1+ 34. Kh2 Nxf2 35. Nxf7+ Kg7 36. Ng5+ Kg6 37. Qg8+ Kf5 38. Rc5+ Qe5 39. Nxf3'
    },

    // --- OPENINGS ---
    {
      id: 'sicilian_dragon',
      level: 'Intermediate',
      title: 'Sicilian Dragon',
      white: 'Veselin Topalov',
      black: 'Garry Kasparov',
      year: 1999,
      event: 'Hoogeveen',
      category: 'Openings',
      badge: 'p-badge-green',
      icon: '🐉',
      why: 'The Dragon Sicilian in full fury. Black fianchettoes the bishop and launches a devastating counterattack on the queenside.',
      pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O 8. Qd2 Nc6 9. Bc4 Bd7 10. O-O-O Rc8 11. Bb3 Ne5 12. h4 h5 13. Bg5 Rc5 14. Kb1 b5 15. g4 hxg4 16. f4 Nc4 17. Bxc4 Rxc4 18. fxg4 b4'
    },
    {
      id: 'french_winawer',
      level: 'Intermediate',
      title: 'French Winawer',
      white: 'Robert Fischer',
      black: 'Wolfgang Uhlmann',
      year: 1962,
      event: 'Varna Olympiad',
      category: 'Openings',
      badge: 'p-badge-blue',
      icon: '🏰',
      why: 'Fischer attacks the French Winawer with precision. Demonstrates how White can exploit the dark-square weaknesses in the French Defence.',
      pgn: '1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5 c5 5. a3 Bxc3+ 6. bxc3 Qc7 7. Nf3 Ne7 8. a4 Nbc6 9. Bd3 Bd7 10. O-O c4 11. Be2 f6 12. Re1 Ng6 13. Ba3 fxe5 14. dxe5 Ncxe5 15. Nxe5 Nxe5 16. Qd4 Ng6 17. Bf3 O-O 18. Bxd5 exd5 19. Qxd5+ Kh8 20. Qxa8 Rxa8 21. Rxe6'
    },
    {
      id: 'london_system',
      level: 'Beginner',
      title: 'London System',
      white: 'Coach',
      black: 'Student',
      year: 'Lesson',
      event: 'Instructional',
      category: 'Openings',
      badge: 'p-badge-teal',
      icon: '🎩',
      why: 'The London System is a reliable, easy-to-learn opening for beginners. Develop bishop to f4, knight to f3, pawns to d4 and e3 — solid and flexible.',
      pgn: '1. d4 d5 2. Bf4 Nf6 3. e3 c5 4. c3 Nc6 5. Nd2 e6 6. Ngf3 Bd6 7. Bg3 O-O 8. Bd3 b6 9. Qe2 Bb7 10. O-O Qe7'
    },

    // --- TACTICS ---
    {
      id: 'greek_gift',
      level: 'Intermediate',
      title: 'The Greek Gift Sacrifice',
      white: 'Edgard Colle',
      black: 'John O\'Hanlon',
      year: 1930,
      event: 'Nice Tournament',
      category: 'Tactics',
      badge: 'p-badge-red',
      icon: '⚡',
      why: 'The classic bishop sacrifice on h7 (Bxh7+!), the "Greek Gift." One of the most important tactical patterns every player must know.',
      pgn: '1. d4 d5 2. Nf3 Nf6 3. e3 c5 4. c3 e6 5. Bd3 Bd6 6. Nbd2 Nbd7 7. O-O O-O 8. Re1 Re8 9. e4 dxe4 10. Nxe4 Nxe4 11. Bxe4 Nf6 12. Bc2 cxd4 13. Nxd4 e5 14. Nf5 Bxf5 15. Bxf5 Qc7 16. Qd3 g6 17. Bxg6 fxg6 18. Qxg6+ Kf8 19. Bg5'
    },
    {
      id: 'windmill',
      level: 'Advanced',
      title: 'The Windmill (Torre)',
      white: 'Carlos Torre',
      black: 'Emanuel Lasker',
      year: 1925,
      event: 'Moscow Tournament',
      category: 'Tactics',
      badge: 'p-badge-gold',
      icon: '🌪️',
      why: 'The legendary "Windmill" attack where discovered checks alternate with captures, winning material with every tempo. A masterclass in geometry.',
      pgn: '1. d4 Nf6 2. Nf3 e6 3. Bg5 c5 4. e3 cxd4 5. exd4 Be7 6. Nbd2 d6 7. c3 Nbd7 8. Bd3 b6 9. Nc4 Bb7 10. Qe2 Qc7 11. O-O O-O 12. Rfe1 Rfe8 13. Rad1 Nf8 14. Bc1 Nd5 15. Ng5 b5 16. Na3 b4 17. cxb4 Nxb4 18. Qh5 Bxg5 19. Bxg5 Nxd3 20. Rxd3 Qa5 21. b4 Qf5 22. Rg3 h6 23. Bc1 Nh7 24. Bf4 Qd5 25. Bxd6 Bf3 26. Rxf3'
    },
    {
      id: 'double_bishop_sac',
      level: 'Advanced',
      title: 'Double Bishop Sacrifice',
      white: 'Emanuel Lasker',
      black: 'Johann Bauer',
      year: 1889,
      event: 'Amsterdam',
      category: 'Tactics',
      badge: 'p-badge-red',
      icon: '♗♗',
      why: 'The original double bishop sacrifice (Bxh7+ followed by Bxg7!). Lasker pioneered this devastating attacking idea that became a standard weapon.',
      pgn: '1. f4 d5 2. e3 Nf6 3. b3 e6 4. Bb2 Be7 5. Bd3 b6 6. Nc3 Bb7 7. Nf3 Nbd7 8. O-O O-O 9. Ne2 c5 10. Ng3 Qc7 11. Ne5 Nxe5 12. Bxe5 Qc6 13. Qe2 a6 14. Nh5 Nxh5 15. Bxh7+ Kxh7 16. Qxh5+ Kg8 17. Bxg7 Kxg7 18. Qg4+ Kh7 19. Rf3 e5 20. Rh3+ Qh6 21. Rxh6+ Kxh6 22. Qd7'
    },

    // --- ENDGAMES ---
    {
      id: 'lucena_position',
      level: 'Intermediate',
      title: 'Lucena Position (Bridge)',
      white: 'Instructor',
      black: 'Learner',
      year: 'Classic',
      event: 'Endgame Study',
      category: 'Endgames',
      badge: 'p-badge-green',
      icon: '🌉',
      why: 'The most important rook endgame technique! Building a "bridge" with your rook to shelter the king and promote the pawn. Every player MUST know this.',
      pgn: '1. Rd1+ Ke7 2. Rd4 Rf2 3. Kc7 Rc2+ 4. Kb6 Rb2+ 5. Kc6 Rc2+ 6. Kb5 Rb2+ 7. Rb4 Rf2 8. Ka6 Ra2+ 9. Kb7 Rb2+ 10. Ka8 Ra2 11. Rb5'
    },
    {
      id: 'philidor_position',
      level: 'Beginner',
      title: 'Philidor Defence (Endgame)',
      white: 'Attacker',
      black: 'Defender',
      year: 'Classic',
      event: 'Endgame Study',
      category: 'Endgames',
      badge: 'p-badge-blue',
      icon: '🛡️',
      why: 'The defensive drawing technique in rook vs rook+pawn. Keep the rook on the 3rd rank, then switch to checking from behind. Essential endgame knowledge!',
      pgn: '1. Ke4 Rf6 2. e6 Rf1 3. Kd5 Rd1+ 4. Ke5 Re1+ 5. Kd6 Rd1+ 6. Ke7 Re1+ 7. Kd8 Rd1+'
    },

    // --- TRAPS & MINIATURES ---
    {
      id: 'legal_trap',
      level: 'Beginner',
      title: 'Légal Trap',
      white: 'Kermur de Légal',
      black: 'Saint Brie',
      year: 1750,
      event: 'Paris',
      category: 'Opening Traps',
      badge: 'p-badge-red',
      icon: '🎣',
      why: 'A brilliant opening trap where White sacrifices the Queen to deliver a stunning checkmate with three minor pieces. A must-know trap in the Italian Game!',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Nc3 Bg4 5. h3 Bh5 6. Nxe5 Bxd1 7. Bxf7+ Ke7 8. Nd5#'
    },
    {
      id: 'fishing_pole',
      level: 'Intermediate',
      title: 'Fishing Pole Trap',
      white: 'Amateur',
      black: 'Master',
      year: 'Lesson',
      event: 'Instructional',
      category: 'Opening Traps',
      badge: 'p-badge-blue',
      icon: '🎣',
      why: 'Black offers a knight to open the h-file for the rook. If White takes the bait, it leads to a quick checkmate! Shows the danger of opening lines against your king.',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Ng4 5. h3 h5 6. hxg4 hxg4 7. Ne1 Qh4 8. f3 g3 9. Rf2 Qh1#'
    },

    // --- STRATEGY & POSITIONAL MASTERY ---
    {
      id: 'capablanca_winter',
      level: 'Advanced',
      title: 'Capablanca\'s Squeeze',
      white: 'Jose Raul Capablanca',
      black: 'William Winter',
      year: 1919,
      event: 'Hastings Victory Congress',
      category: 'Strategy',
      badge: 'p-badge-gold',
      icon: '🧠',
      why: 'Capablanca demonstrates ultimate positional mastery by trapping Winter\'s bishop on g6 and essentially playing a piece up on the queenside.',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. Bb5 Bd6 5. O-O O-O 6. d4 exd4 7. Nxd4 Nxd4 8. Qxd4 c6 9. Ba4 b5 10. Bb3 a5 11. a3 Qc7 12. Bg5 Be5 13. Qd3 d6 14. f4 Bxc3 15. Qxc3 Nd7 16. Rad1 c5 17. Bd5 Ra6 18. Qg3 Kh8 19. Be7 Re8 20. Bxf7 Rxe7 21. Bd5 Nf6 22. e5 Nxd5 23. Rxd5 Be6 24. exd6 Rxd6 25. Rxd6 Qxd6 26. f5 Qd4+ 27. Qf2 Bc4 28. Qxd4 cxd4 29. Rd1 Rd7 30. b3 Bf7 31. c3 d3 32. Kf2 Kg8 33. Ke3 Kf8 34. Rxd3 Rxd3+ 35. Kxd3 Ke7 36. c4 bxc4+ 37. bxc4 Kd6 38. Kd4 Kc6 39. g4 h6 40. h4 a4 41. g5 h5 42. g6 Bg8 43. c5 Ba2 44. Ke5 Kxc5 45. f6 gxf6+ 46. Kxf6 Kd4 47. Kg5 Kc3 48. Kxh5 Kb2 49. Kg5 Kxa3 50. h5 Kb2 51. h6 a3 52. h7 Bb1 53. h8=Q+ Kb3 54. g7 a2 55. g8=Q+ Kc2 56. Qc4+ Kd1 57. Qh1+ Kd2 58. Qhc1#'
    },
    {
      id: 'karpov_kamsky',
      level: 'Elite',
      title: 'Karpovian Boa Constrictor',
      white: 'Anatoly Karpov',
      black: 'Gata Kamsky',
      year: 1996,
      event: 'Elista WCC',
      category: 'Prophylaxis',
      badge: 'p-badge-teal',
      icon: '🐍',
      why: 'Karpov strangles Kamsky with perfect prophylactic play, preventing all counterplay before launching a decisive breakthrough.',
      pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. Nf3 Bg7 5. Qb3 dxc4 6. Qxc4 O-O 7. e4 Na6 8. Be2 c5 9. d5 e6 10. O-O exd5 11. exd5 Bf5 12. Bf4 Re8 13. Rad1 Ne4 14. Nb5 Qf6 15. Bd3 Qxb2 16. Rb1 Qf6 17. Rfe1 g5 18. Bxe4 gxf4 19. Bxf5 Qxf5 20. Nd6 Rxe1+ 21. Rxe1 Qd7 22. Qxf4 Nb4 23. Nf5 Kh8 24. Nxg7 Kxg7 25. Qg5+ Kh8 26. Qf6+ Kg8 27. Re5 h6 28. Qxh6 f6 29. Qxf6 Qf7 30. Rg5+ Kf8 31. Qh8+ Ke7 32. Qxa8 Nxd5 33. Qxb7+ Kf6 34. Qxd5 Qxd5 35. Rxd5'
    },

    // --- DEFENSIVE MASTERPIECES ---
    {
      id: 'petrosian_spassky',
      level: 'Elite',
      title: 'Petrosian\'s Exchange Sac',
      white: 'Tigran Petrosian',
      black: 'Boris Spassky',
      year: 1966,
      event: 'Moscow WCC',
      category: 'Defense',
      badge: 'p-badge-blue',
      icon: '🛡️',
      why: 'Petrosian, the "Iron Tigran," executes his signature positional exchange sacrifice to build an impenetrable fortress and seize the initiative.',
      pgn: '1. d4 Nf6 2. Nf3 e6 3. Bg5 d5 4. Nbd2 Be7 5. e3 O-O 6. Bd3 c5 7. c3 b6 8. O-O Bb7 9. Ne5 Nbd7 10. f4 Ne4 11. Bxe7 Qxe7 12. Rf3 f5 13. Rh3 Ndf6 14. Nxe4 dxe4 15. Bc4 Bd5 16. Bxd5 exd5 17. dxc5 bxc5 18. Qa4 Rab8 19. b3 Rb6 20. Rd1 Rd8 21. Rg3 Rbd6 22. Qb5 Qc7 23. h3 a6 24. Qe2 Nd7 25. Nxd7 Qxd7 26. c4 d4 27. exd4 cxd4 28. c5 Rd5 29. Qc4 Kh8 30. b4 e3 31. Qd3 Re8 32. Re1 Qa4 33. a3 Qb5 34. Qxb5 axb5 35. Kf1 Kg8 36. Rf3 Kf7 37. g4 fxg4 38. hxg4 h5 39. gxh5 Rxh5 40. Ke2 Rd5 41. Kd3 Ra8 42. Ke4 Rdd8 43. c6 Rxa3 44. Rc1 Rc3 45. Rxc3 dxc3 46. Rxe3 Re8+ 47. Kd3 Rxe3+ 48. Kxe3 Ke6 49. Kd3 Kd6 50. Kxc3 Kxc6 51. Kd4 Kd6 52. Ke4 Ke6 53. f5+ Kf6 54. Kf4 Kf7 55. Ke5 Ke7 56. Kd5 Kf6 57. Kc5 Kxf5 58. Kxb5 g5 59. Kc4 g4 60. Kd3 g3 61. Ke2 Ke5 62. b5 Kd5 63. b6 Kc6 64. b7 Kxb7 65. Kf3 g2 66. Kxg2'
    },

    // --- MODERN CLASSICS ---
    {
      id: 'carlsen_anand',
      level: 'Elite',
      title: 'Carlsen vs Anand (WCC)',
      white: 'Magnus Carlsen',
      black: 'Vishy Anand',
      year: 2013,
      event: 'World Championship G5',
      category: 'Positional',
      badge: 'p-badge-gold',
      icon: '👑',
      why: 'Carlsen squeezes Anand in a Berlin Defence, converting a minimal advantage into a win with masterful technique. The dawn of the Carlsen era.',
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. d3 Bc5 5. c3 O-O 6. O-O Re8 7. Re1 a6 8. Ba4 b5 9. Bb3 d6 10. Bg5 Be6 11. Nbd2 h6 12. Bh4 Bxb3 13. axb3 Nb8 14. h3 Nbd7 15. Nh2 Qe7 16. Ndf1 Bb6 17. Ne3 Qe6 18. Nhf1 a5 19. Bg3 d5 20. exd5 Qxd5 21. d4 e4'
    },
    {
      id: 'ding_nepo',
      level: 'Elite',
      title: 'Ding vs Nepomniachtchi',
      white: 'Ding Liren',
      black: 'Ian Nepomniachtchi',
      year: 2023,
      event: 'World Championship G12',
      category: 'Endgame Mastery',
      badge: 'p-badge-teal',
      icon: '🏆',
      why: 'The decisive game of the 2023 World Championship rapid tiebreak. Ding Liren becomes the 17th World Champion with a brilliant endgame conversion.',
      pgn: '1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. h3 dxc4 5. e3 c5 6. Bxc4 a6 7. O-O b5 8. Be2 Bb7 9. a4 b4 10. Nbd2 Nbd7 11. b3 Be7 12. Bb2 O-O 13. Nc4 Qc7 14. Rc1 Rac8 15. Nce5 Nxe5 16. Nxe5 Nd7 17. Nxd7 Qxd7 18. e4 cxd4 19. Qxd4 Bc5 20. Qe5 Rfd8'
    }
  ],


  setLevel(containerId, boardId, level) {
    this.activeLevels[containerId] = level;
    this.renderCards(containerId, boardId);
  },

  // ── Lichess API Integration ──

  _lichessCache: [],
  _lichessLoading: false,

  async fetchLichessGames(username, boardId) {
    if (!username || this._lichessLoading) return;
    this._lichessLoading = true;
    const isCoach = (boardId || '').startsWith('coach');
    const containerId = isCoach ? 'coachPgnLibStrip' : 'studentPgnLibStrip';
    const el = document.getElementById(containerId);
    if (el) {
      const strip = el.querySelector('.pgn-lib-strip');
      if (strip) strip.innerHTML = '<div style="color:var(--p-text-muted);padding:20px;text-align:center;">⏳ Fetching games from Lichess…</div>';
    }

    try {
      const r = await fetch(
        `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=12&rated=true&perfType=classical,rapid,blitz&moves=true&clocks=false&evals=false&opening=true`,
        { headers: { Accept: 'application/x-chess-pgn' } }
      );
      if (!r.ok) throw new Error('Lichess API error');
      const pgnText = await r.text();
      const rawGames = pgnText.split(/(?=\[Event\s)/i).filter(s => s.trim());

      this._lichessCache = rawGames.map((raw, i) => {
        const h = {};
        const hRe = /\[([A-Za-z0-9_]+)\s+"([^"]*)"\]/g;
        let m;
        while ((m = hRe.exec(raw)) !== null) h[m[1]] = m[2];
        return {
          id: 'lichess_' + i + '_' + Date.now(),
          level: 'Lichess',
          title: h.Event || 'Lichess Game',
          white: h.White || '?',
          black: h.Black || '?',
          year: h.UTCDate ? h.UTCDate.split('.')[0] : '?',
          event: h.Event || 'Lichess',
          category: h.TimeControl || 'Online',
          badge: 'p-badge-teal',
          icon: '🌐',
          why: `${h.White || '?'} (${h.WhiteElo || '?'}) vs ${h.Black || '?'} (${h.BlackElo || '?'}) — ${h.Result || '*'}`,
          pgn: raw.trim()
        };
      });

      if (window.CK && CK.showToast) CK.showToast(`🌐 Loaded ${this._lichessCache.length} games for "${username}" from Lichess`, 'success');
      this.activeLevels[containerId] = 'Lichess';
      this.renderCards(containerId, boardId);
    } catch (e) {
      if (window.CK && CK.showToast) CK.showToast('Could not fetch Lichess games. Check the username.', 'error');
    } finally {
      this._lichessLoading = false;
    }
  },

  async fetchLichessGame(gameId, boardId) {
    try {
      if (window.CK && CK.showToast) CK.showToast('Fetching game from Lichess…', 'info');
      const r = await fetch(
        `https://lichess.org/game/export/${encodeURIComponent(gameId)}?moves=true&clocks=false&evals=false`,
        { headers: { Accept: 'application/x-chess-pgn' } }
      );
      if (!r.ok) throw new Error('Not found');
      const pgn = await r.text();
      const isCoach = (boardId || '').startsWith('coach');
      const inputId = isCoach ? 'coachLabPgnInput' : 'labPgnInput';
      const input = document.getElementById(inputId);
      if (input) input.value = pgn.trim();
      if (window.CK && CK.lab) CK.lab.analyzePgn(pgn.trim(), boardId || 'studentLabBoard');
      if (window.CK && CK.showToast) CK.showToast('Game imported from Lichess!', 'success');
    } catch (e) {
      if (window.CK && CK.showToast) CK.showToast('Could not fetch game. Check the ID.', 'error');
    }
  },

  // ── Chess.com API Integration ──

  _chesscomCache: [],
  _chesscomLoading: false,

  async fetchChesscomGames(username, boardId) {
    if (!username || this._chesscomLoading) return;
    this._chesscomLoading = true;
    const isCoach = (boardId || '').startsWith('coach');
    const containerId = isCoach ? 'coachPgnLibStrip' : 'studentPgnLibStrip';
    const el = document.getElementById(containerId);
    if (el) {
      const strip = el.querySelector('.pgn-lib-strip');
      if (strip) strip.innerHTML = '<div style="color:var(--p-text-muted);padding:20px;text-align:center;">⏳ Fetching games from Chess.com…</div>';
    }

    try {
      // Get archives list to find latest month
      const archR = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`);
      if (!archR.ok) throw new Error('Player not found on Chess.com');
      const archData = await archR.json();
      const archives = archData.archives || [];
      if (!archives.length) throw new Error('No games found');

      // Fetch latest month's games (JSON for richer metadata)
      const latestUrl = archives[archives.length - 1];
      const gamesR = await fetch(latestUrl);
      if (!gamesR.ok) throw new Error('Could not fetch games');
      const gamesData = await gamesR.json();
      const games = (gamesData.games || []).slice(-15);

      this._chesscomCache = games.map((g, i) => {
        const isWhite = (g.white?.username || '').toLowerCase() === username.toLowerCase();
        return {
          id: 'chesscom_' + i + '_' + Date.now(),
          level: 'Chess.com',
          title: g.time_class ? g.time_class.charAt(0).toUpperCase() + g.time_class.slice(1) : 'Game',
          white: g.white?.username || '?',
          black: g.black?.username || '?',
          year: g.end_time ? new Date(g.end_time * 1000).getFullYear() : '?',
          event: g.rules || 'chess',
          category: g.time_class || 'Online',
          badge: 'p-badge-green',
          icon: '♟',
          why: `${g.white?.username || '?'} (${g.white?.rating || '?'}) vs ${g.black?.username || '?'} (${g.black?.rating || '?'}) — ${isWhite ? g.white?.result : g.black?.result}`,
          pgn: g.pgn || ''
        };
      }).filter(g => g.pgn);

      if (window.CK && CK.showToast) CK.showToast(`♟ Loaded ${this._chesscomCache.length} games for "${username}" from Chess.com`, 'success');
      this.activeLevels[containerId] = 'Chess.com';
      this.renderCards(containerId, boardId);
    } catch (e) {
      if (window.CK && CK.showToast) CK.showToast('Could not fetch Chess.com games. Check the username.', 'error');
      console.warn('[PGN Library] Chess.com error:', e);
    } finally {
      this._chesscomLoading = false;
    }
  },

  renderCards(containerId, boardId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.style.display = 'block';
    el.style.overflow = 'visible';

    if (!this.activeLevels[containerId]) {
      this.activeLevels[containerId] = 'Beginner';
    }
    const currentLevel = this.activeLevels[containerId];

    // Filter games by source
    let filteredGames;
    if (currentLevel === 'Lichess') {
      filteredGames = this._lichessCache;
    } else if (currentLevel === 'Chess.com') {
      filteredGames = this._chesscomCache;
    } else {
      filteredGames = this.games.filter(g => g.level === currentLevel);
    }

    const badgeColors = {
      'p-badge-gold'  : '#e8b84b',
      'p-badge-red'   : '#ef4444',
      'p-badge-blue'  : '#3b82f6',
      'p-badge-teal'  : '#14b8a6',
      'p-badge-green' : '#22c55e',
      'p-badge-yellow': '#f59e0b'
    };

    const levels = ['Beginner', 'Intermediate', 'Advanced', 'Elite', 'Lichess', 'Chess.com'];
    const tabColorMap = { 'Lichess': 'var(--p-teal)', 'Chess.com': '#7fa650' };

    const tabsHtml = `
      <div class="pgn-lib-tabs" style="display:flex; gap:8px; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px; flex-wrap:wrap; align-items:center;">
        ${levels.map(lvl => {
          const isActive = lvl === currentLevel;
          const accent = tabColorMap[lvl] || 'var(--p-gold)';
          const icon = lvl === 'Lichess' ? '🌐 ' : lvl === 'Chess.com' ? '♟ ' : '';
          return `
          <button class="pgn-lib-tab ${isActive ? 'active' : ''}" 
                  style="background:${isActive ? accent.replace(')', ',0.15)').replace('var(', 'rgba(232,184,75,').replace('--p-gold', '').replace('--p-teal', '20,184,166') : 'rgba(255,255,255,0.04)'}; 
                         ${isActive ? `background:${lvl === 'Lichess' ? 'rgba(20,184,166,0.15)' : lvl === 'Chess.com' ? 'rgba(127,166,80,0.15)' : 'rgba(232,184,75,0.15)'};` : ''}
                         border:1px solid ${isActive ? (lvl === 'Lichess' ? 'var(--p-teal)' : lvl === 'Chess.com' ? '#7fa650' : 'var(--p-gold)') : 'rgba(255,255,255,0.08)'}; 
                         color:${isActive ? (lvl === 'Lichess' ? 'var(--p-teal)' : lvl === 'Chess.com' ? '#7fa650' : 'var(--p-gold)') : 'rgba(255,255,255,0.6)'}; 
                         padding:6px 14px; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.2s;"
                  onclick="CK.pgnLibrary.setLevel('${containerId}', '${boardId}', '${lvl}')">
            ${icon}${lvl}
          </button>`;
        }).join('')}
      </div>
    `;

    // Platform search bar (Lichess / Chess.com tabs)
    let searchHtml = '';
    if (currentLevel === 'Lichess') {
      searchHtml = `
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">
        <input id="pgnLibLichessUser_${containerId}" class="p-form-control" 
               style="flex:1;min-width:160px;max-width:260px;font-size:0.82rem;height:34px;padding:0 12px;"
               placeholder="Lichess username (e.g. DrNykterstein)">
        <button class="p-btn p-btn-teal p-btn-sm" 
                onclick="CK.pgnLibrary.fetchLichessGames(document.getElementById('pgnLibLichessUser_${containerId}').value,'${boardId}')">
          🔍 Fetch Games
        </button>
        <div style="display:flex;gap:5px;align-items:center;">
          <input id="pgnLibLichessId_${containerId}" class="p-form-control" 
                 style="width:130px;font-size:0.82rem;height:34px;padding:0 10px;"
                 placeholder="Game ID…">
          <button class="p-btn p-btn-ghost p-btn-sm" 
                  onclick="CK.pgnLibrary.fetchLichessGame(document.getElementById('pgnLibLichessId_${containerId}').value,'${boardId}')">
            ⬇ Import
          </button>
        </div>
      </div>`;
    } else if (currentLevel === 'Chess.com') {
      searchHtml = `
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">
        <input id="pgnLibChesscomUser_${containerId}" class="p-form-control" 
               style="flex:1;min-width:160px;max-width:260px;font-size:0.82rem;height:34px;padding:0 12px;"
               placeholder="Chess.com username (e.g. Hikaru)">
        <button class="p-btn p-btn-sm" style="background:#7fa650;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-weight:600;cursor:pointer;"
                onclick="CK.pgnLibrary.fetchChesscomGames(document.getElementById('pgnLibChesscomUser_${containerId}').value,'${boardId}')">
          ♟ Fetch Games
        </button>
        <span style="font-size:0.72rem;color:rgba(255,255,255,0.35);">Latest month · max 15 games</span>
      </div>`;
    }

    const emptyMsg = currentLevel === 'Lichess'
      ? 'Search a Lichess username above to load their games'
      : currentLevel === 'Chess.com'
        ? 'Search a Chess.com username above to load their games'
        : 'No games in this category';

    const cardsHtml = `
      <div class="pgn-lib-strip" style="display:flex; gap:12px; overflow-x:auto; padding-bottom:8px;">
        ${filteredGames.length ? filteredGames.map(g => {
          const col = badgeColors[g.badge] || '#e8b84b';
          return `
            <div class="pgn-lib-card" data-game-id="${g.id}" onclick="CK.pgnLibrary.load('${g.id}','${boardId}')">
              <div class="pgn-lib-card-icon" style="color:${col};">${g.icon}</div>
              <div class="pgn-lib-card-body">
                <div class="pgn-lib-card-title">${g.title}</div>
                <div class="pgn-lib-card-players">${g.white} vs ${g.black}</div>
                <div class="pgn-lib-card-meta">
                  <span class="pgn-lib-year">${g.year}</span>
                  <span class="p-badge ${g.badge}" style="font-size:.65rem;padding:1px 7px;">${g.category}</span>
                </div>
                <div class="pgn-lib-card-why">${g.why}</div>
              </div>
              <button class="pgn-lib-load-btn">Load ▶</button>
            </div>`;
        }).join('') : `<div style="color:var(--p-text-muted);padding:20px;text-align:center;width:100%;">${emptyMsg}</div>`}
      </div>
    `;

    el.innerHTML = tabsHtml + searchHtml + cardsHtml;
  },


  load(id, boardId) {
    // Check library games first, then Lichess cache, then Chess.com cache
    let g = this.games.find(x => x.id === id);
    if (!g) g = this._lichessCache.find(x => x.id === id);
    if (!g) g = this._chesscomCache.find(x => x.id === id);
    if (!g) return;
    
    const isCoach = (boardId || '').startsWith('coach');
    const inputId  = isCoach ? 'coachLabPgnInput' : 'labPgnInput';
    const input    = document.getElementById(inputId);
    if (input) input.value = g.pgn;
    if (window.CK && CK.lab) CK.lab.analyzePgn(g.pgn, boardId || 'studentLabBoard');
    if (window.CK && CK.showToast) CK.showToast(`♟ "${g.title}" (${g.year}) loaded — ${g.category}`, 'success');

    const stripId = isCoach ? 'coachPgnLibStrip' : 'studentPgnLibStrip';
    const strip = document.getElementById(stripId);
    if (strip) {
      strip.querySelectorAll('.pgn-lib-card').forEach(c => c.classList.remove('active'));
      const activeCard = strip.querySelector(`[data-game-id="${id}"]`);
      if (activeCard) activeCard.classList.add('active');
    }
  }
};
