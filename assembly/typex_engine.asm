; Include Irvine32 library declarations
INCLUDE Irvine32.inc

.data
    ; Fallback paragraph string in case of reading errors
    en_easy0_fallback BYTE "The cat sat on the mat and fell fast asleep.", 0

    ; Folder and path constructor elements
    dir_paragraphs BYTE "data/paragraphs/", 0
    str_underscore BYTE "_", 0
    str_txt_ext    BYTE ".txt", 0

    ; Pointers to lang/diff flags
    lang_name      DWORD ?
    diff_name      DWORD ?
    
    ; Constructed path buffer
    file_path      BYTE 128 DUP(0)
    
    ; File I/O buffers
    fileBuf        BYTE 8192 DUP(0)
    bytesRead      DWORD 0
    fileHandle     DWORD ?
    
    ; Offset pointers of parsed lines
    lineOffsets    DWORD 256 DUP(0)
    
    ; Short language codes for filename construction
    lang_en        BYTE "en", 0
    lang_es        BYTE "es", 0
    lang_fr        BYTE "fr", 0
    lang_de        BYTE "de", 0

    ; Command line argument flags
    str_get_para BYTE "--get-paragraph", 0
    str_calc     BYTE "--calculate", 0
    str_easy     BYTE "easy", 0
    str_medium   BYTE "medium", 0
    str_hard     BYTE "hard", 0
    str_spanish  BYTE "spanish", 0
    str_french   BYTE "french", 0
    str_german   BYTE "german", 0
    
    ; Relative file paths for data handoff
    file_original BYTE "data/input_original.txt", 0
    file_typed    BYTE "data/input_typed.txt", 0
    file_time     BYTE "data/input_time.txt", 0
    file_results  BYTE "data/results.txt", 0
    
    ; Buffers
    originalBuf BYTE 1024 DUP(0)
    typedBuf    BYTE 1024 DUP(0)
    timeBuf     BYTE 64 DUP(0)
    resultBuf   BYTE 2048 DUP(0)
    
    ; Numeric values
    originalLen DWORD 0
    typedLen    DWORD 0
    timeSeconds DWORD 0
    
    ; Typing metrics
    correctCount DWORD 0
    wrongCount   DWORD 0
    wpm          DWORD 0
    accuracy     DWORD 0
    score        DWORD 0
    
    ; Rank strings
    rank_beginner BYTE "Beginner", 0
    rank_pro      BYTE "Pro", 0
    rank_elite    BYTE "Elite", 0
    rank_ptr      DWORD ?
    
    ; Mistake frequency array for letters A-Z (26 dwords)
    mistakesArray DWORD 26 DUP(0)
    
    ; Text formatting labels
    lbl_wpm           BYTE "WPM: ", 0
    lbl_accuracy      BYTE "Accuracy: ", 0
    lbl_correct       BYTE "CorrectChars: ", 0
    lbl_wrong         BYTE "WrongChars: ", 0
    lbl_score         BYTE "Score: ", 0
    lbl_rank          BYTE "Rank: ", 0
    lbl_mistakes      BYTE "Mistakes: ", 0
    str_comma_space   BYTE ", ", 0
    str_colon         BYTE ":", 0

.code

; =========================================================================
; StrContains
; Checks if ESI contains EDI (case-insensitive substring search)
; Output: EAX = 1 if found, 0 if not found
; =========================================================================
StrContains PROC
    push ecx
    push edx
    push esi
    push edi
    
    ; Get search string length in ECX
    mov ecx, 0
    mov ebx, edi
LenLoop:
    cmp byte ptr [ebx], 0
    je LenDone
    inc ecx
    inc ebx
    jmp LenLoop
LenDone:
    
    test ecx, ecx
    jz Found ; empty search string matches immediately
    
OuterLoop:
    mov al, [esi]
    test al, al
    jz NotFound ; reached end of source string without match
    
    ; Save current positions to compare substring
    push esi
    push edi
    push ecx
    
CompareLoop:
    mov dl, [edi]
    test dl, dl
    jz MatchFound ; reached end of search string -> matches!
    
    mov al, [esi]
    test al, al
    jz NoMatch
    
    ; Case-insensitive conversions (convert A-Z to a-z)
    cmp al, 'A'
    jb SkipUpperAL
    cmp al, 'Z'
    ja SkipUpperAL
    add al, 32
SkipUpperAL:

    cmp dl, 'A'
    jb SkipUpperDL
    cmp dl, 'Z'
    ja SkipUpperDL
    add dl, 32
SkipUpperDL:
    
    cmp al, dl
    jne NoMatch
    
    inc esi
    inc edi
    dec ecx
    jmp CompareLoop
    
NoMatch:
    pop ecx
    pop edi
    pop esi
    inc esi ; move search forward by 1 character
    jmp OuterLoop
    
MatchFound:
    pop ecx
    pop edi
    pop esi
    jmp Found

NotFound:
    mov eax, 0
    jmp Done
Found:
    mov eax, 1
Done:
    pop edi
    pop esi
    pop edx
    pop ecx
    ret
StrContains ENDP


; =========================================================================
; WriteStringToFile
; Writes null-terminated string ESI to filename EDX
; =========================================================================
WriteStringToFile PROC
    push eax
    push ecx
    push edx
    push edi
    
    ; Create/Open output file
    call CreateOutputFile
    cmp eax, INVALID_HANDLE_VALUE
    je ErrorOut
    
    push eax ; save file handle
    
    ; Calculate string length
    mov edi, esi
    mov ecx, 0
LenCheck:
    cmp byte ptr [edi], 0
    je LenCheckDone
    inc ecx
    inc edi
    jmp LenCheck
LenCheckDone:
    
    ; Write to file
    pop eax ; restore file handle
    mov edx, esi ; content pointer
    call WriteToFile
    
    ; Close file
    call CloseFile
    
ErrorOut:
    pop edi
    pop edx
    pop ecx
    pop eax
    ret
WriteStringToFile ENDP


; =========================================================================
; ReadStringFromFile
; Reads content of filename EDX into buffer ESI, max size ECX
; Output: EAX = bytes read, buffer is null-terminated
; =========================================================================
ReadStringFromFile PROC
    push ebx
    push ecx
    push edx
    push esi
    
    call OpenInputFile
    cmp eax, INVALID_HANDLE_VALUE
    je ErrorReadPop
    
    mov ebx, eax ; save file handle
    
    ; Read from file
    mov eax, ebx
    mov edx, [esp]   ; Load ESI (buffer pointer) safely from stack
    mov ecx, [esp+8] ; Restore ECX (max buffer size) safely from stack (overcomes OpenInputFile clobbering)
    call ReadFromFile
    jc ErrorReadPop ; If Carry Flag set, read failed with error
    
    push eax ; save bytes read
    
    ; Close file
    mov eax, ebx
    call CloseFile
    
    pop eax ; restore bytes read
    
    ; Null-terminate the buffer
    mov edx, [esp] ; get buffer pointer
    mov byte ptr [edx + eax], 0
    
    pop esi
    pop edx
    pop ecx
    pop ebx
    ret
    
ErrorReadPop:
    pop esi
ErrorRead:
    mov eax, 0
    pop edx
    pop ecx
    pop ebx
    ret
ReadStringFromFile ENDP


; =========================================================================
; StringToInteger (atoi)
; Parses null-terminated decimal string ESI into integer in EAX
; =========================================================================
StringToInteger PROC
    push ebx
    push ecx
    push edx
    push esi
    
    mov eax, 0 ; accumulator
    mov ebx, 10 ; base
    
NextChar:
    movzx ecx, byte ptr [esi]
    test ecx, ecx
    jz DoneAtoi
    
    ; Skip control chars/whitespaces
    cmp cl, 13
    je SkipChar
    cmp cl, 10
    je SkipChar
    cmp cl, ' '
    je SkipChar
    
    ; validate digit
    cmp cl, '0'
    jb DoneAtoi
    cmp cl, '9'
    ja DoneAtoi
    
    sub cl, '0'
    mul ebx ; EAX = EAX * 10
    add eax, ecx
    
SkipChar:
    inc esi
    jmp NextChar
    
DoneAtoi:
    pop esi
    pop edx
    pop ecx
    pop ebx
    ret
StringToInteger ENDP


; =========================================================================
; TrackMistake
; Increments mistakesArray count for the character passed in DL
; =========================================================================
TrackMistake PROC
    ; If DL is upper case A-Z, map to index 0-25
    cmp dl, 'A'
    jb NotUpper
    cmp dl, 'Z'
    ja NotUpper
    sub dl, 'A'
    movzx eax, dl
    inc mistakesArray[eax*4]
    jmp DoneTrack
    
NotUpper:
    ; If DL is lower case a-z, map to index 0-25
    cmp dl, 'a'
    jb DoneTrack
    cmp dl, 'z'
    ja DoneTrack
    sub dl, 'a'
    movzx eax, dl
    inc mistakesArray[eax*4]
    
DoneTrack:
    ret
TrackMistake ENDP


; =========================================================================
; WriteDecToBuffer
; Converts unsigned integer EAX to decimal string and appends to EDI.
; EDI is left pointing to the null terminator.
; =========================================================================
WriteDecToBuffer PROC
    push ebx
    push ecx
    push edx
    push esi
    
    mov ecx, 0      ; digit count
    mov ebx, 10     ; base
    
L1:
    mov edx, 0
    div ebx         ; EAX = quotient, EDX = remainder
    push edx        ; push digit remainder
    inc ecx
    test eax, eax
    jnz L1
    
L2:
    pop edx
    add dl, '0'
    mov [edi], dl
    inc edi
    loop L2
    
    mov byte ptr [edi], 0 ; write null-terminator
    
    pop esi
    pop edx
    pop ecx
    pop ebx
    ret
WriteDecToBuffer ENDP


; =========================================================================
; Text formatting helper functions
; =========================================================================
AppendString PROC
    push esi
LoopAppend:
    mov al, [esi]
    test al, al
    jz DoneAppend
    mov [edi], al
    inc edi
    inc esi
    jmp LoopAppend
DoneAppend:
    mov byte ptr [edi], 0
    pop esi
    ret
AppendString ENDP

AppendNewLine PROC
    mov byte ptr [edi], 13
    inc edi
    mov byte ptr [edi], 10
    inc edi
    mov byte ptr [edi], 0
    ret
AppendNewLine ENDP

AppendDec PROC
    call WriteDecToBuffer
    ret
AppendDec ENDP


; =========================================================================
; CalculateResults
; Reads inputs, compares strings, calculates WPM/Acc/Score, writes results
; =========================================================================
CalculateResults PROC
    ; 1. Read input files
    mov edx, OFFSET file_original
    mov esi, OFFSET originalBuf
    mov ecx, 1000
    call ReadStringFromFile
    mov originalLen, eax
    
    mov edx, OFFSET file_typed
    mov esi, OFFSET typedBuf
    mov ecx, 1000
    call ReadStringFromFile
    mov typedLen, eax
    
    mov edx, OFFSET file_time
    mov esi, OFFSET timeBuf
    mov ecx, 50
    call ReadStringFromFile
    
    ; Convert time to integer
    mov esi, OFFSET timeBuf
    call StringToInteger
    mov timeSeconds, eax
    
    ; Prevent divide by zero
    cmp timeSeconds, 0
    jne TimeOk
    mov timeSeconds, 1
TimeOk:
    
    ; 2. Direct index character-by-character comparison
    mov ecx, typedLen
    test ecx, ecx
    jz DoneCompare
    
    mov esi, 0 ; loop index
CompareLoopStart:
    cmp esi, ecx
    jae DoneCompare
    
    mov al, typedBuf[esi]
    cmp esi, originalLen
    jae ExtraChar
    
    mov dl, originalBuf[esi]
    cmp al, dl
    jne MismatchChar
    
    inc correctCount
    jmp NextIter
    
MismatchChar:
    inc wrongCount
    ; Track the character the user missed (originalBuf[esi])
    call TrackMistake
    jmp NextIter
    
ExtraChar:
    ; User typed extra characters beyond original string length
    inc wrongCount
    
NextIter:
    inc esi
    jmp CompareLoopStart
DoneCompare:
    
    ; 3. Accuracy = (CorrectChars * 100) / TotalTyped
    mov eax, correctCount
    add eax, wrongCount
    cmp eax, 0
    jne CalcAcc
    mov accuracy, 0
    jmp DoneAcc
CalcAcc:
    mov ebx, eax ; ebx = total typed
    mov eax, correctCount
    mov edx, 0
    mov ecx, 100
    mul ecx
    div ebx
    mov accuracy, eax
DoneAcc:
    
    ; 4. WPM = (CorrectChars * 12) / TimeSeconds
    mov eax, correctCount
    mov edx, 0
    mov ecx, 12
    mul ecx
    div timeSeconds
    mov wpm, eax
    
    ; 5. Score = (CorrectChars * 10) - (WrongChars * 5)
    mov eax, correctCount
    mov ecx, 10
    mul ecx
    mov ebx, eax ; ebx = correct * 10
    
    mov eax, wrongCount
    mov ecx, 5
    mul ecx ; eax = wrong * 5
    
    cmp ebx, eax
    jae SubScore
    mov score, 0
    jmp DoneScore
SubScore:
    sub ebx, eax
    mov score, ebx
DoneScore:
    
    ; 6. Set rank based on speed
    cmp wpm, 30
    jae ComparePro
    mov rank_ptr, OFFSET rank_beginner
    jmp DoneRank
ComparePro:
    cmp wpm, 60
    ja CompareElite
    mov rank_ptr, OFFSET rank_pro
    jmp DoneRank
CompareElite:
    mov rank_ptr, OFFSET rank_elite
DoneRank:
    
    ; 7. Format details into resultBuf
    mov edi, OFFSET resultBuf
    
    ; "WPM: X\r\n"
    mov esi, OFFSET lbl_wpm
    call AppendString
    mov eax, wpm
    call AppendDec
    call AppendNewLine
    
    ; "Accuracy: X\r\n"
    mov esi, OFFSET lbl_accuracy
    call AppendString
    mov eax, accuracy
    call AppendDec
    call AppendNewLine
    
    ; "CorrectChars: X\r\n"
    mov esi, OFFSET lbl_correct
    call AppendString
    mov eax, correctCount
    call AppendDec
    call AppendNewLine
    
    ; "WrongChars: X\r\n"
    mov esi, OFFSET lbl_wrong
    call AppendString
    mov eax, wrongCount
    call AppendDec
    call AppendNewLine
    
    ; "Score: X\r\n"
    mov esi, OFFSET lbl_score
    call AppendString
    mov eax, score
    call AppendDec
    call AppendNewLine
    
    ; "Rank: [Beginner/Pro/Elite]\r\n"
    mov esi, OFFSET lbl_rank
    call AppendString
    mov esi, rank_ptr
    call AppendString
    call AppendNewLine
    
    ; "Mistakes: E:5, A:3\r\n"
    mov esi, OFFSET lbl_mistakes
    call AppendString
    
    ; Append letter mistakes
    mov ecx, 0 ; character offset (0 to 25)
    mov edx, 0 ; comma flag (0 = first item, 1 = need comma)
MistakeLoop:
    cmp ecx, 26
    jae DoneMistakes
    
    mov eax, mistakesArray[ecx * 4]
    cmp eax, 0
    jbe NextMistake
    
    cmp edx, 1
    jne NoComma
    push eax
    push ecx
    mov esi, OFFSET str_comma_space
    call AppendString
    pop ecx
    pop eax
NoComma:
    mov edx, 1
    
    ; Append character glyph
    push eax
    push ecx
    mov al, 'A'
    add al, cl
    mov [edi], al
    inc edi
    mov byte ptr [edi], 0
    
    ; Append colon
    mov esi, OFFSET str_colon
    call AppendString
    pop ecx
    pop eax
    
    ; Append count
    call AppendDec
    
NextMistake:
    inc ecx
    jmp MistakeLoop
DoneMistakes:
    call AppendNewLine
    
    ; 8. Write resultBuf to file
    mov edx, OFFSET file_results
    mov esi, OFFSET resultBuf
    call WriteStringToFile
    
    ret
CalculateResults ENDP


; =========================================================================
; Main Entry Point
; =========================================================================
main PROC
    ; Get pointer to command line arguments
    call GetCommandLineA
    mov esi, eax ; ESI points to arguments
    
    ; 1. Check if command line contains "--get-paragraph"
    mov edi, OFFSET str_get_para
    call StrContains
    cmp eax, 1
    jne CheckCalc
    
    ; --- Parse Language ---
    ; Check Spanish
    mov edi, OFFSET str_spanish
    call StrContains
    cmp eax, 1
    je LangSpanish

    ; Check French
    mov edi, OFFSET str_french
    call StrContains
    cmp eax, 1
    je LangFrench

    ; Check German
    mov edi, OFFSET str_german
    call StrContains
    cmp eax, 1
    je LangGerman

    ; Default to English
    jmp LangEnglish

LangSpanish:
    mov lang_name, OFFSET lang_es
    jmp ParseDiff

LangFrench:
    mov lang_name, OFFSET lang_fr
    jmp ParseDiff

LangGerman:
    mov lang_name, OFFSET lang_de
    jmp ParseDiff

LangEnglish:
    mov lang_name, OFFSET lang_en
    jmp ParseDiff

ParseDiff:
    ; Parse difficulty
    mov edi, OFFSET str_medium
    call StrContains
    cmp eax, 1
    je DiffMedium
    
    mov edi, OFFSET str_hard
    call StrContains
    cmp eax, 1
    je DiffHard
    
    ; Default to Easy
    mov diff_name, OFFSET str_easy
    jmp FetchAndSelect

DiffMedium:
    mov diff_name, OFFSET str_medium
    jmp FetchAndSelect

DiffHard:
    mov diff_name, OFFSET str_hard
    jmp FetchAndSelect

FetchAndSelect:
    ; 1. Build filename path
    mov edi, OFFSET file_path
    
    mov esi, OFFSET dir_paragraphs
    call AppendString
    
    mov esi, lang_name
    call AppendString
    
    mov esi, OFFSET str_underscore
    call AppendString
    
    mov esi, diff_name
    call AppendString
    
    mov esi, OFFSET str_txt_ext
    call AppendString
    
    ; 2. Open input paragraph file
    mov edx, OFFSET file_path
    call OpenInputFile
    cmp eax, INVALID_HANDLE_VALUE
    je ErrorSelect
    
    mov fileHandle, eax
    
    ; 3. Read entire file into fileBuf
    mov edx, OFFSET fileBuf
    mov ecx, 8190
    call ReadFromFile
    jc CloseAndError
    
    mov bytesRead, eax
    mov fileBuf[eax], 0
    
    ; 4. Close file handle
    mov eax, fileHandle
    call CloseFile
    
    ; 5. Parse lines into lineOffsets
    mov esi, OFFSET fileBuf
    mov edi, OFFSET lineOffsets
    mov ecx, 0
    
    cmp byte ptr [esi], 0
    je ErrorSelect
    
    mov [edi], esi
    add edi, 4
    inc ecx
    
ScanLoop:
    mov al, [esi]
    test al, al
    jz DoneScan
    
    cmp al, 10
    jne NotLF
    
    mov byte ptr [esi], 0
    
    cmp esi, OFFSET fileBuf
    je CheckNextLine
    cmp byte ptr [esi - 1], 13
    jne CheckNextLine
    mov byte ptr [esi - 1], 0
    
CheckNextLine:
    mov dl, [esi + 1]
    test dl, dl
    jz DoneScan
    cmp dl, 13
    je SkipChar
    cmp dl, 10
    je SkipChar
    
    lea eax, [esi + 1]
    mov [edi], eax
    add edi, 4
    inc ecx
    jmp NotLF
    
SkipChar:
NotLF:
    inc esi
    jmp ScanLoop
    
DoneScan:
    test ecx, ecx
    jz ErrorSelect
    
    ; 6. Select random line
    call Randomize
    mov eax, ecx
    call RandomRange
    
    mov esi, lineOffsets[eax*4]
    mov edx, OFFSET file_original
    call WriteStringToFile
    jmp DoneMain
    
CloseAndError:
    mov eax, fileHandle
    call CloseFile
ErrorSelect:
    mov esi, OFFSET en_easy0_fallback
    mov edx, OFFSET file_original
    call WriteStringToFile
    jmp DoneMain
    
CheckCalc:
    ; 2. Check if command line contains "--calculate"
    mov edi, OFFSET str_calc
    call StrContains
    cmp eax, 1
    jne DoneMain
    call CalculateResults

DoneMain:
    INVOKE ExitProcess, 0
main ENDP

END main
