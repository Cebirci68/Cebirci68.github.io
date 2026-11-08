// Cebirci Kelebek 7.03 — complementary desk pairs for four-level sessions.
function solveFourLevelPlan({rooms, flags, globalTotals, totalCapacity, maxDev, seconds}) {
    const deadline = Date.now() + Math.min(seconds, 4) * 1000;
    if (!flags.side || !flags.rows || rooms.some(r => r.layout !== 'double' || r.useTeacherDesk || r.filledCount !== r.capacity)) return null;
    const students = rooms.flatMap(r => r.placed.filter(Boolean));
    if (students.some(s => s.fixedRoom)) return null;
    const grades = [...new Set(students.map(s => s.grade))].sort((a, b) => a - b);
    if (grades.length !== 4 || grades.some(g => new Set(students.filter(s => s.grade === g).map(s => s.examSubject)).size !== 1)) return null;
    const genders = [...new Set(students.map(s => s.gender))];
    if (genders.length > 2 || genders.some(g => !g)) return null;
    const remaining = grades.map(g => students.filter(s => s.grade === g).length);
    const genderTarget = grades.map(g => students.filter(s => s.grade === g && s.gender === genders[0]).length);
    const pairs = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
    const choices = rooms.map(room => {
        const groups = new Map();
        for (const cell of room.geometry.cells) {
            if (cell.seat > room.capacity || cell.side !== 0) continue;
            if (!groups.has(cell.g)) groups.set(cell.g, []);
            groups.get(cell.g).push(cell.seat);
        }
        const plans = new Map();
        function visit(columns, desks, counts) {
            if (Date.now() >= deadline) return;
            if (!columns.length) {
                const deviation = Math.max(...counts.map((n, i) => Math.abs(n - room.capacity * globalTotals[grades[i]] / totalCapacity)));
                if (flags.balance && deviation > maxDev + 1e-8) return;
                const key = counts.join(',');
                if (!plans.has(key)) plans.set(key, {counts, deviation, variants: []});
                plans.get(key).variants.push(desks);
                return;
            }
            const [seats, ...rest] = columns;
            for (const pair of pairs) {
                const opposite = [0,1,2,3].filter(i => !pair.includes(i));
                const types = seats.map((seat, i) => i % 2 ? opposite : pair);
                const half = seats.at(-1) === room.capacity;
                for (const last of half ? types.at(-1) : [null]) {
                    const next = counts.slice();
                    const column = seats.map((seat, i) => {
                        const levels = half && i === seats.length - 1 ? [last] : types[i];
                        levels.forEach(level => next[level]++);
                        return {seat, levels};
                    });
                    visit(rest, desks.concat(column), next);
                }
            }
        }
        visit([...groups.values()], [], [0,0,0,0]);
        return [...plans.values()].sort((a,b) => a.deviation-b.deviation);
    });
    const ceilings = [...new Set(choices.flat().map(p => p.deviation))].sort((a,b)=>a-b);
    const pools = new Map(students.map(s => [JSON.stringify([s.grade,s.gender]),s]));
    function seatPlan(selected) {
        // Vary desk pairings while preserving each chosen room's level counts.
        for (let trial = 0; trial < 64 && Date.now() < deadline; trial++) {
            const variants = selected.map((p, i) => p.variants[trial === 0 ? 0 : (Math.imul(trial + 1, 2654435761 + i * 179) >>> 0) % p.variants.length]);
            const groups = new Map();
            variants.forEach((desks, ri) => desks.forEach(desk => {
                const key = desk.levels.join(',');
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push({...desk, ri});
            }));
            const types = [...groups.values()].sort((a,b)=>a.length-b.length);
            const suffix = Array.from({length:types.length+1},()=>[0,0,0,0]);
            for(let i=types.length-1;i>=0;i--){
                suffix[i]=suffix[i+1].slice();
                types[i][0].levels.forEach(g=>suffix[i][g]+=types[i].length);
            }
            const target = genderTarget.slice(), picked = [], failed = new Set();
            function assignGender(i) {
                if (Date.now() >= deadline || target.some((n,g)=>n<0 || n>suffix[i][g])) return false;
                if (i === types.length) return true;
                const key = i + ':' + target.join(',');
                if (failed.has(key)) return false;
                const desks = types[i], levels = desks[0].levels;
                const min = Math.max(0,...levels.map(g=>target[g]-suffix[i+1][g]));
                const max = Math.min(desks.length,...levels.map(g=>target[g]));
                for(let n=min;n<=max;n++){
                    levels.forEach(g=>target[g]-=n);
                    picked[i]=n;
                    if(assignGender(i+1)) return true;
                    levels.forEach(g=>target[g]+=n);
                }
                failed.add(key);
                return false;
            }
            if (!assignGender(0)) continue;
            const assignments = rooms.map(()=>[]);
            types.forEach((desks,i)=>desks.forEach(({ri,seat,levels},j)=>{
                const gender = genders[j < picked[i] ? 0 : 1];
                levels.forEach((level,offset)=>{
                    const grade = grades[level];
                    const student = pools.get(JSON.stringify([grade,gender]));
                    assignments[ri].push({seat:seat+offset,type:{grade,key:JSON.stringify([grade,student.examSubject,gender,''])}});
                });
            }));
            return {feasible:true,assignments};
        }
        return null;
    }
    for (const ceiling of ceilings) {
        const options = choices.map(list=>list.filter(p=>p.deviation<=ceiling+1e-8));
        if (options.some(list=>!list.length)) continue;
        const min = Array.from({length:rooms.length+1},()=>[0,0,0,0]);
        const max = Array.from({length:rooms.length+1},()=>[0,0,0,0]);
        for(let i=rooms.length-1;i>=0;i--) for(let g=0;g<4;g++){
            min[i][g]=min[i+1][g]+Math.min(...options[i].map(p=>p.counts[g]));
            max[i][g]=max[i+1][g]+Math.max(...options[i].map(p=>p.counts[g]));
        }
        const selected = [];
        function chooseRoom(i) {
            if (Date.now() >= deadline || remaining.some((n,g)=>n<min[i][g] || n>max[i][g])) return null;
            if (i === rooms.length) return seatPlan(selected);
            for (const plan of options[i]) {
                selected[i]=plan;
                plan.counts.forEach((n,g)=>remaining[g]-=n);
                const solution=chooseRoom(i+1);
                plan.counts.forEach((n,g)=>remaining[g]+=n);
                if (solution) return solution;
            }
            return null;
        }
        const result = chooseRoom(0);
        if (result) return result;
        if (Date.now() >= deadline) break;
    }
    return null;
}
