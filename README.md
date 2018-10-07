# sqpack
square enix ffxiv sqpack parser in node.js

## File Segments
### SqPack Index Files
```
#### INDEX FILE RESEARCH #### By Ioncannon

Current research on SqPack Index files

===SQPACK HEADER=== (0x400 in size)
0x000: Signature        Int32; "SqPack", followed by 0's (12 bytes)
0x00c: Header Length    Int32;  
0x010: ~~Unknown~~             Int32; Unknown but repeated in other header
0x014: SqPack Type      Int32; Type 0: SQDB, Type 1: Data, Type 2: Index
0x018: ~~Unknown~~             A lot of 0s, but 0xFFFF at 0x20
0x3c0: SHA-1 of Header    20B; SHA-1 of bytes 0x000-0x3BF, starts 64bytes before end of header
~~~~~~~~Padding~~~~~~~~~       Padding of 0's till [Header Length]

===SEGMENT HEADER=== (starts after SQPACK HEADER)
0x000: Header Length    Int32;

Each Segment follows this (starting right after header length):
0x000: Unknown/Num Dats Int32; For segment 2 it's the number of dats for this archive (dat0, dat1, etc), for others unknown.
0x004: Segment Offset   Int32; Offset to the segment
0x008: Segment Size     Int32; How large a segment is
0x00c: SHA-1 of Segment   20B; Hash of the segment... [Segment Offset] to [Segment Offset] + [Segment Size]

Notes: 
-Segment 1 is usually files, Segment 2/3 is unknown, Segment 4 is folders.
-Segments may not exist, but their position is still treated as if they did (benchmark has no segment 3 but you still need to skip it's bytes).
-Each segment is followed by a padding of 0x28 0's, except the first one, which has 4 extra 0s.

===FILE SEGMENTS=== (each one is at each folder's [Files Offset], in segment 1) (Each is 16 bytes padded)
0x000: File ID1 Hash    Int32; Hash to the file name
0x004: File ID2 Hash    Int32; Hash to the file path
0x008: File Data Offset Int32; Multiply by 0x08, points to compressed data in .dat file
0x00b: Padding                 Padded to a total segment entry size of 16 bytes.

===FOLDER SEGMENTS=== (seen in segment 3, points to files in segment 1) (Each is 16 bytes padded)
0x000: FOLDER ID Hash   Int32; Hash to the folder name
0x004: Files Offset     Int32; Offset to file list in segment 1.
0x008: Total Files Size Int32; Total size of all file segments for this folder. To find # files, divide by 0x10 (16).
0x00b: Padding                 Padded to a total segment entry size of 16 bytes.

NOTES:

-Check the final byte of the offset. If Offset & 0x000F == 2, then the offset is pointing to dat1 rather dat0. Also remember 
to subtract the 0x2 out. Theoretically, 0x4 would mean dat2 but unknown as of now. 
```

### SqPack Dat Files
```
#### DAT FILE RESEARCH #### By Ioncannon

Current research on SqPack Dat files

Last Updated: 12/14/2014

===SQPACK HEADER=== (0x400 in size)
0x000: Signature        Int32; "SqPack", followed by 0's (12 bytes)
0x00c: Header Length    Int32;  
0x010: ~~Unknown~~      Int32; Unknown but repeated in other header
0x014: SqPack Type      Int32; Type 0: SQDB, Type 1: Data, Type 2: Index
0x018: ~~Unknown~~             A lot of 0s, but 0xFFFF at 0x20
0x3c0: SHA-1 of Header  20B;   SHA-1 of bytes 0x000-0x3BF, starts 64bytes before end of header
~~~~~~~~Padding~~~~~~~~~       Padding of 0's till [Header Length]

===DATA HEADER=== (0x400 in size)
0x000: Header Length    Int32;
0x004: NULL
0x008: ~~Unknown~~      Int32; Static Value of 0x10
0x00c: Data Size        Int32; From end of this header (usually 0x800) to EOF. Divided by 0x08.
0x010: Spanned DAT      Int32; 0x01 = .dat0, 0x02 = .dat1 or .dat2, etc
0x014: NULL             Int32;
0x018: Max File Size    Int32; Always 0x77359400 or 2GB. Interestingly if a file is > 2GB, a dat1 is formed. In 13 dat, is 20MB?
0x01c: NULL             Int32;
0x020: SHA1 of Data     20B;   From end of this header (usually 0x800) to EOF
0x3c0: SHA1 of Header   20B;   Starts 64bytes before end of header
~~~~~~~~~~Padding~~~~~~~       Padding of 0's till [Header Length]

-----DATA IS BELOW THIS LINE------ !!!Use Index to find entries!!!

~~~~~~~~~~~~~~

===DATA ENTRY HEADER=== (Minimum size is 0x80) 
0x000: Header Length     Int32; 
0x004: Content Type      Int32; 0x01 - Empty Placeholder, 0x02 - Binary, 0x03 - Model, 0x04 - Texture
0x008: Uncompressed Size Int32;
0x00c: ~~Unknown~~       Int32;
0x010: Block Buffer Size Int32; Buffer size need to read largest block
0x014: Num Blocks        Int32;  

===TYPE-2 BLOCK TABLE=== (Size of Num blocks)
0x000: Offset                  Int32; From end of this header (Check [File Entry Offset] + [Header Length])
0x004: Block Size              Short; Total Block Size, from beginning of header to end of padding.
0x006: Decompressed Data Size  Short;

===TYPE-3 BLOCK TABLE=== (Size of Num blocks)

0x000: Unknown					           Int32; Always 0x05000001
0x004: Frame Uncompressed Chunk	        44 Bytes; Each Block Follows Pattern: 5 Ints, 12b of NULL, 3 Ints. Size when uncompressed, but rounded
0x030: Frame Size Chunk			        44 Bytes; Size of each frame (can be more than 1 data block).
0x05C: Frame Offset Chunk		        44 Bytes; Offset to start of frame. 
0x088: Block Size Indexes				   Short; Indexes into the next table below???
0x0D0: Block Size Table			Num Blocks*Short; Size of each data block below
			
===TYPE-4 BLOCK TABLE=== (Size of Num blocks)
0x000: Frame Offset				Int32; Starting block for this frame.
0x004: Frame Size				Int32; This is the total size of the whole frame.
0x008: Unknown				    Int32;
0x00C: Frame Blocksize Offset  	Int32; Offset starting from the end of the block table, to the first size.
0x010: Frame Blocksize Count	Int32; How many blocks this frame contains.
0x000: Frame Block Size         Short; The size of the block in this frame. 

~~~~~~~~~~~~~~

~~~EXTRACTED FILE HEADER MAY BE HERE, PREPEND TO EXTRACT FILE~~~

-----Zlib compressed data starts here------- !!!Used Block table to find each block!!!

===BLOCK HEADER===
0x000: Header Size         Int32; Seems to be always 0x10bytes
0x004: NULL                Int32;
0x008: Compressed Length   Int32; If this is 32000, IT'S NOT COMPRESSED. Use decompressed length to read the data in and just append
0x00c: Decompressed Length Int32; Will be max 16kb.

0x010: Compressed Data          ; Size will be [Compressed Length]
```

### EXHF String Files
```
#### EXHF RESEARCH #### By Ioncannon

Updated: 7/14/2015

Current research on EXHF files

!!!NOTE: FILE IS IN BIG ENDIAN FORM!!!

===EXHF Header===
0x000 Signature    			Int32; EXHF
0x004 Version	  			Short; Always 0x03
0x006 Size of Dataset Chunk Short; How large the data set chunk will be. 
0x008 Number of Datasets    Short; Size of Dataset Definition table; 
0x00A Number of Pages       Short; The size of the Page table below.
0x00C Number of Lang Codes 	Short; Size of the language table at the end of the file.
0x00E Unknown   	   		Short;
0x010 Unknown           	Int32; Always 0x010000.
0x014 Number of entries		Int32; How many total entries are in this file (spanning multiple EXDFs)
0x018 Padding                    ; Padded to 0x1F

===Dataset Definition Table=== (Size of Number of Datasets) 
0x000 Data Type				Short; Most likely the data type. 2 - Byte, 3 - Byte, 4 - Short, 19 - String
0x002 Data Offset			Short; Where in the data chunk this byte is (offset is after 01 and the chunk size variables).

===Page Table=== (Size of Number of Pages) 
0x000 Page Entry            Int32; Page Entry Name. See Items Page entry names.
0x004 Page Entry Size       Int32; Number of entries in a page. For example Item_0.exd has 500 entries... 0x1F4, with item_500.exd being the next file.  

===Languge Table==== (Size of Number of Lang Codes)

0x000 Language Code			Short;

The language codes are:

0x0 - n/a (No language)
0x1 - ja (Japanese)
0x2 - en (English)
0x3 - de (German)
0x4 - fr (French)
0x5 - chs (Chinese - Singapore)
0x6 - cht (Chinese - Traditional)
0x7 - ko (Korean)

-----------------------NOTES---------------------
  
-The items.exd files span multiple pages. Start at items_0, then items__500, then items__1000, etc.
```

### EXDF String Files
```
#### EXDF RESEARCH #### By Ioncannon

Current research on EXDF files

!!!NOTE: FILE IS IN BIG ENDIAN FORM!!!

===HEADER=== (Header is 32 bytes, padded with 0s)
0x000: Signature                Int32; "EXDF"
0x004: Version              	Short; Seems to be always 0x0002
0x006: Unknown              	Short;
0x008: Offset Table Size    	Int32; Size of the offset table (below) 
0x00C: Data Section Size    	Int32; Size of the string data section
0x00F: Padding                   	 ;Up to 0x1F

===OFFSET TABLE=== (starts 0x1F(32) bytes from 0x00)
0x000: Index                	Int32; These continue on from page to page, not starting at 0 in every file.
0x004: Offset               	Int32; Points to a string segment in the data section  

===DATA SECTION=== (starts after [Offset Table] or [Offset Table Size] * 0x08 + 0x1F) THIS IS MOST LIKELY DEFINED IN EXH file.
0x000: Size of chunk        	Int32; Starting after this header
0x004: Unknown              	Short;
0x006: Data Chunk
	   String Chunk              	 ;After Data Chunk, look in EXH for size of data chunk to skip
	
~~~~~DEFINED IN EXH FILE~~~~~~~~~~~~

------Data Types-----

>=0x19: bitflags *

0xb: 4 ints packed in 64 bits
0x9: float
0x7: uint
0x6: int
0x5: ushort
0x4: short
0x3: ubyte
0x2: byte
0x1: bool
0x0: string

*If greater or equal to 0x19, subtract datatype by 0x19. This value is the position of the bit in the data
at the given offset. If bit == 1, true else false.

------Variables------

Special variables can be within strings. The follow the format:

0x00: Start Marker, always 0x02
0x01: Type
0x02: Size of payload including End Marker
0x03: Payload
0x--: End marker, always 0x03

Known Types:

0x13: Color Change
0x20: Value Amount?
0x27: Name Start, (0x01 0x01 0x01 0x01)
0x27: Name End, (0xCF 0x01 0x01 0x01)
0x28: Icon?
0x2E: Autotranslate


Examples:

<Player First Name>: 02 2C 0D FF 07 02 29 03 EB 02 03 FF 02 20 02 03 (File 0x67A9C0A, 0x1A79)
<Player Last Name>:  02 2C 0D FF 07 02 29 03 EB 02 03 FF 02 20 03 03
<HQ ICON> 02 28 0A FF 06 41 64 64 6F 6E 0A 01 03
<Gil Amount> 02 20 03 E8 03 03 
```

### SCD Square Enix Sound Container Files
```
#### SCD FILE RESEARCH #### By Ioncannon

!Some information was based on VGMStream!

Current research on SCD music/sound files. Sorry it's a mess.

Structure (based on 0c0000.win32.index):

===SEDB SSCF HEADER===
0x00 Signature         Int64; SEDBSSCF
0x08 Version           Int32; For FFXIV should be 3;
0x0C ~~Unknown~~       Short; Seems to be always 0x0400
0x0E Header Size~~     Short; Points to the address where the next header is (also size of this header). Seems to be always 0x30.
0x10 File Size         Int32; Total File size
~~~~~~~~Padding~~~~~~~~       Padded to fill 48 bytes (0x2F

===OFFSETS HEADER===
0x00 Size of Offset Table 0             Short;
0x02 Size of Sound Entry Offset Table   Short; This is also the number of sounds in this file.
0x04 Size of Offset Table 2             Short;
0x06 ~~Unknown~~                        Short; In one file: 0x0001, in another 0x270F 
0x08 Offset Table 0 Offset              Int32;
0x0C Sound Entry Offset Table Offset    Int32;
0x10 Offset to Offset Table 2           Int32; 
0x14 ~~Unknown/Null~~~                  Int32;
0x18 Offset To ???				        Int32; 
  
--Table 0: 4 * [Size of Table 1]
--Table 1: 4 * [Size of Table 2]
--Table 2: 4 * [Size of Table 3] ;Offsets to Sound Entries
--Table 3: 4 * [Size of Table 1] 

--Data 1 [Pointed from Table 3]
--Data 2 [Pointed from Table 0]
--Data 3 [Pointed from Table 1]
  2027296
---------------MUSIC IS HERE----------------------------
  
===SOUND ENTRY HEADER=== (32 byte header)
0x00 Music File Length Int32; 
0x04 Num Channels      Int32; 0x01: Mono, 0x02: Stereo, FFXIV is usually 0x02 channels
0x08 Frequency         Int32; FFXIV is usually 44100HZ (AC440000)
0x0C Data Type         Int32; 0x0C: MS-ADPCM, 0x06: OGG. FFXIV seems to use OGG for music, MS-ADPCM for sound.
0x10 Loop Start        Int32; In Bytes. Calculation: (filesize/amount of samples)*sample
0x14 Loop End          Int32; Ditto, if you wanted to loop a whole song, set this to the file's size.
0x18 First Frame Pos   Int32; First OggS after (possibly, not always) encrypted header.
0x1C Aux Chunk Count   Short; Number of Aux Chunks

===AUX CHUNKS===
-----MARK----
0x00 ID                Int32; ASCII MARK Id
0x04 Chunk Size        Int32; Size of this chunk, from start to end.
0x08 Mark Table        ;Chunk Size / 4 entries.

===IF MS-ADPCM===
WAVEFORMATEX           See: http://msdn.microsoft.com/en-us/library/windows/desktop/dd390970%28v=vs.85%29.aspx
ADPCMCOEFSET           Int32; * 7

===IF OGG SEEK TABLE HEADER=== (32 bytes)
0x00 Encode Type		   Short; Seems to tell what encoding is being used. 02,20 is XOR. 03,20 is Heavensward one.
0x02 Encode Byte            Byte; If encoding is 02,20, XOR the header with this byte
0x04 
0x08 
0x0c 
0x10 Size of Seek Table    Int32; How many seek table entries there are.	
0x14 Vorbis Header Size    Int32; Size of the Ogg Vorbis header (for decoding purpose).
0x18 
~~~~~~~~~Padding~~~~~~~~       Padded to fill 32bytes 	

===SEEK TABLE=== (Size is 4 * [Num Seek Table])
0x00 Seek Entry        Int32; An offset from the Vorbis header to some Ogg page. 

===VORBIS HEADER== (Size is [Vorbis Header Size])
-A standard Ogg Vorbis header. Check the encode byte in the seek table header to see if this header is encoded. If it is,
XOR all header bytes with the encode byte.
-Many songs have a LOOPSTART and LOOPEND comment tag defining where music should begin and end after the first loop.

===DATA===
Ogg Vorbis data is here

--------------Duplicate Header-----------------------------
It seems that the first header is 3 chunks in size, each 0x120 bytes long. It's the Vorbis
Indentification, Comment, and Setup headers. This is repeated after. 

-------------Heavensward Encoding--------------------------
Square Enix had encrypted the Heavensward music using a strange algorithm. Before decoding, you need the XOR table which can be found in the .exe if you search for:

3A 32 32 32 03 7E 12 F7 B2 E2 A2 67 32 32 22 32

The XOR table is 0xFF byte long.

Example code to decode (note dataLength is [Music File Length] in the entry header):

private void xorDecodeFromTable(byte[] dataFile, int dataLength) {
	int byte1 = dataLength & 0xFF & 0x7F;
	int byte2 = byte1 & 0x3F;
	for (int i = 0; i < dataFile.length; i++)
	{			
		int xorByte = XORTABLE[(byte2 + i) & 0xFF];
		xorByte &= 0xFF;
		xorByte ^= (dataFile[i]&0xFF);
		xorByte ^= byte1;
		dataFile[i] = (byte) xorByte;
	}
} 

--------------To Inject OGG-------------------------------

-Change total file size
-Change single file size
-Change First Frame Position value
-Change Header length value
-Add data to end

--------------Putting MS-ADPCM into WAV--------------------
-Write "RIFF"
-Write 36 + [Size of first frame to end of file]
-Write "WAVE"
-Write "fmt "
-Write 0x10
-Write wave header
-Write "data"
-Write [Size of first frame to end of file]
-Write data from [Size of first frame to end of file]
 
--------------Ogg Vorbis format info for understanding the encrypted header-----------------

===OGG PAGE===
0x00 Signature        Int32;  Value is OggS 
0x04 Version          Byte;   Seems to be 0x00 for FFXIV
0x05 Type             Byte;   Type of header: 0x01: Continuation, 0x02: Beginning, 0x03: End
0x06 Granule Position Int64;
0x0E Serial Number    Int32;  Seems to be 0x00 for FFXIV
0x12 Sequence Number  Int32;
0x16 Checksum         Int32;
0x1E Num Page Segs    Byte;   Seems to be 0x01 for FFXIV
0x1F Segment table    Byte;   Each segment is a byte long, * 0x1E's value. However, FFXIV's music only has 1 segment it seems, thus 1 byte size.
 
===VORBIS PAGE===
0x00 Header Type      Byte;   Type of vorbis header: 0x01: ID Header, 0x03: Comment Header, 0x05: Setup Header. If has leading 0, audio header.
0x01 Signature        6Bytes; VORBIS
 
--If ID Header--
1 [vorbis_version] = read 32 bits as unsigned integer
2 [audio_channels] = read 8 bit integer as unsigned
3 [audio_sample_rate] = read 32 bits as unsigned integer
4 [bitrate_maximum] = read 32 bits as signed integer
5 [bitrate_nominal] = read 32 bits as signed integer
6 [bitrate_minimum] = read 32 bits as signed integer
7 [blocksize_0] = 2 exponent (read 4 bits as unsigned integer)
8 [blocksize_1] = 2 exponent (read 4 bits as unsigned integer)
9 [framing_flag] = read one bit

--If Comment Header---
1 [vendor length] = read an unsigned integer of 32 bits
2 [vendor string] = size of vendor length; Seems to be always �Xiph.Org libVorbis I 20040717� with a varying year.
3 [fields] = read an unsigned integer of 32 bits; FFXIV only uses the LoopStart and LoopEnd fields
```

### Macro File
```
MACRO DAT FILE By Ioncannon

0x00: Unknown
0x02: Unknown
0x04: Size of file minux 0x20?
0x08: Size of macro book from 0x10.

After a 0x11 byte header, the macro entries begin. All macro entries
are XOR encoded with 0x73.
	
Each macro entry follows this format:

-Title
-Icon
-Key
-Line List

Each section begins with a marker (T, I, K, L), followed by two bytes (little endian) telling the size, and then the data. 
Data seems to be always null terminated. For example: 

A title: T 06 00 Greet\0
A icon: I 08 00 001024B\0
A key: K 04 00 005\0
A line: L 0A 00 Well met!\0

Each macro entry contains 1 title, 1 icon, 1 key, and 15 lines. All three of these entries must exist even if not used,
with data size being 0x01 for Titles and Lines, containing an empty string ("\0"). 

-Max line size is 0xB5.
-Max lines is 15.
-99 macros must exist, regardless if used (values are empty as above).
-Icons are hex values to the icon table. There is a exh file called "macroicon.exh" which contains all usable icons. The key MUST equal the row number (hex) of the icon. This is how SE fixed the 
issue of allowing icons outside this set to be used.

After 99 macros, the data is padded with 0s to 0x46000. This is most likely to allow the max amount of data to be filled
for all macros, lines, and titles.  
```

## Read More
- [sqpack explore](http://ffxivexplorer.fragmenterworks.com/research.php)
