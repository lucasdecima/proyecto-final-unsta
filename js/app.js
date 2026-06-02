let trips = [];

function showSection(sectionId) {
  const sections = document.querySelectorAll(".section");
  
  sections.forEach(sec => {
    sec.classList.remove("active");
  });

  document.getElementById(sectionId).classList.add("active");
}

function rentBike() {
  const trip = {
    date: new Date().toLocaleString(),
    duration: Math.floor(Math.random() * 30) + " min"
  };

  trips.push(trip);
  alert("🚲 Bici alquilada!");
  renderTrips();
}

function renderTrips() {
  const list = document.getElementById("tripList");
  list.innerHTML = "";

  trips.forEach(trip => {
    const li = document.createElement("li");
    li.textContent = `${trip.date} - ${trip.duration}`;
    list.appendChild(li);
  });
}