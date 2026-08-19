"use client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
import { useEffect, useMemo, useState } from "react";

const servicios = [
  { nombre: "Promoción escolar niño", precio: 80 },
  { nombre: "Corte de niño", precio: 80 },
  { nombre: "Corte de adulto", precio: 100 },
  { nombre: "Corte Barba y ceja", precio:100  },
];

type Cita = {
  fecha: string;
  hora: string;
  nombre: string;
  servicio: string;
};

function generarHorarios(
  horaInicio: number,
  minutoInicio: number,
  horaFin: number,
  minutoFin: number
) {
  const resultado: string[] = [];

  let minutosActuales = horaInicio * 60 + minutoInicio;
  const minutosFinales = horaFin * 60 + minutoFin;

  while (minutosActuales <= minutosFinales) {
    const hora = Math.floor(minutosActuales / 60);
    const minutos = minutosActuales % 60;

    resultado.push(
      `${String(hora).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`
    );

    minutosActuales += 30;
  }

  return resultado;
}

const horariosSemana = generarHorarios(18, 0, 22, 0);
const horariosSabado = generarHorarios(9, 0, 22, 0);

function horaBonita(hora: string) {
  const [h, m] = hora.split(":");
  const numero = Number(h);

  const periodo = numero >= 12 ? "PM" : "AM";
  const hora12 = numero % 12 || 12;

  return `${hora12}:${m} ${periodo}`;
}

function fechaBonita(fecha: string) {
  if (!fecha) return "";

  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${fecha}T12:00:00`));
}

function fechaISO(fecha: Date) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}

export default function Home() {
  // Solo se usa para recibir las citas por WhatsApp.
  // No aparece en la portada.
  const whatsappNumber = "524491194848";

  const [nombre, setNombre] = useState("");
  const [servicio, setServicio] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [citas, setCitas] = useState<Cita[]>([]);
  const [mostrarAdmin, setMostrarAdmin] = useState(false);
const [usuario, setUsuario] = useState("");
const [contrasena, setContrasena] = useState("");
const [rol, setRol] = useState<"admin" | "trabajador" | null>(null);



async function iniciarSesion() {
  if (usuario === "Omar" && contrasena === "101028") {
    setRol("admin");
    setMostrarAdmin(true);
    return;
  }

  if (usuario === "Omar" && contrasena === "101028") {
    setRol("trabajador");
    setMostrarAdmin(true);
    return;
  }

  alert("Usuario o contraseña incorrectos");
}

useEffect(() => {
  async function cargarCitas() {
    const { data, error } = await supabase
      .from("citas")
      .select("*")
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    if (error) {
      console.error("Error al cargar citas:", error);
      return;
    }

    if (data) {
      setCitas(data);
    }
  }

  cargarCitas();
}, []);
  const citasActivas = useMemo(() => {
    const ahora = new Date();

    return citas.filter((cita) => {
      const fechaHora = new Date(`${cita.fecha}T${cita.hora}:`);
      return fechaHora > ahora;
    });
  }, [citas]);

  useEffect(() => {
    if (citas.length > 0 && citasActivas.length !== citas.length) {
      setCitas(citasActivas);

      localStorage.setItem(
        "omar-barber-citas",
        JSON.stringify(citasActivas)
      );
    }
  }, [citas, citasActivas]);

  // CALENDARIO DE LOS PRÓXIMOS 14 DÍAS
  const diasCalendario = useMemo(() => {
    const dias = [];

    const hoy = new Date();

    for (let i = 0; i < 14; i++) {
      const fechaNueva = new Date(hoy);
      fechaNueva.setDate(hoy.getDate() + i);

      dias.push(fechaNueva);
    }

    return dias;
  }, []);

  function obtenerDiaSemana(fechaSeleccionada: string) {
    if (!fechaSeleccionada) return -1;

    return new Date(`${fechaSeleccionada}T12:00:00`).getDay();
  }

  const esDomingo =
    fecha !== "" && obtenerDiaSemana(fecha) === 0;

  const esSabado =
    fecha !== "" && obtenerDiaSemana(fecha) === 6;

  const horariosDisponibles = useMemo(() => {
    if (!fecha) return [];

    if (esDomingo) {
      return [];
    }

    if (esSabado) {
      return horariosSabado;
    }

    return horariosSemana;
  }, [fecha, esDomingo, esSabado]);

  function seleccionarFecha(fechaSeleccionada: string) {
    setFecha(fechaSeleccionada);
    setHora("");
  }

  function estaOcupado(horaSeleccionada: string) {
    return citasActivas.some(
      (cita) =>
        cita.fecha === fecha &&
        cita.hora === horaSeleccionada
    );
  }

  function citaYaPaso(horaSeleccionada: string) {
    if (!fecha) return false;

    const fechaHora = new Date(
      `${fecha}T${horaSeleccionada}:00`
    );

    return fechaHora <= new Date();
  }

  const servicioElegido = servicios.find(
    (item) => item.nombre === servicio
  );

  const formularioCompleto =
    nombre.trim() !== "" &&
    servicio !== "" &&
    fecha !== "" &&
    hora !== "" &&
    !esDomingo;

  async function confirmarCita() {
    if (!formularioCompleto) return;

    if (estaOcupado(hora)) {
      alert("Ese horario ya está ocupado.");
      return;
    }

    const nuevaCita: Cita = {
      nombre: nombre.trim(),
      servicio,
      fecha,
      hora,
    };

    const { error } = await supabase.from("citas").insert([
  {
    nombre: nombre.trim(),
    servicio,
    fecha,
    hora,
  },
]);

if (error) {
  alert("No se pudo guardar la cita. Intenta de nuevo.");
  console.error(error);
  return;
}

    const nuevasCitas = [...citasActivas, nuevaCita];

    setCitas(nuevasCitas);

    localStorage.setItem(
      "omar-barber-citas",
      JSON.stringify(nuevasCitas)
    );

    const precioTexto =
      servicioElegido?.precio !== null &&
      servicioElegido?.precio !== undefined
        ? `$${servicioElegido.precio} MXN`
        : "Precio a consultar";

    const mensaje = [
      "NUEVA CITA - OMAR BARBER",
      "",
      `Nombre: ${nombre.trim()}`,
      `Servicio: ${servicio}`,
      `Precio: ${precioTexto}`,
      `Fecha: ${fechaBonita(fecha)}`,
      `Hora: ${horaBonita(hora)}`,
      "",
      "Gracias por agendar en Omar Barber.",
    ].join("\n");

    const link = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      mensaje
    )}`;

    window.open(link, "_blank");
  }

  function cancelarCita(index: number) {
    const confirmar = window.confirm(
      "¿Seguro que quieres cancelar esta cita?"
    );

    if (!confirmar) return;

    const nuevasCitas = citasActivas.filter(
      (_, i) => i !== index
    );

    setCitas(nuevasCitas);

    localStorage.setItem(
      "omar-barber-citas",
      JSON.stringify(nuevasCitas)
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* PORTADA */}

      <section
        style={{
          minHeight: "90vh",
          backgroundImage:
            "linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.88)), url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1800&q=85')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "30px",
        }}
      >
        <div>
          <p
            style={{
              color: "#d9b35c",
              letterSpacing: "5px",
              fontWeight: "bold",
            }}
          >
            BIENVENIDO A
          </p>

          <h1
            style={{
              fontSize: "clamp(52px, 9vw, 100px)",
              margin: "10px 0",
              letterSpacing: "-3px",
            }}
          >
            OMAR BARBER
          </h1>

          <p
            style={{
              fontSize: "22px",
              color: "#e4e4e4",
              marginBottom: "35px",
            }}
          >
            Estilo, precisión y buen servicio.
          </p>

          <a
            href="#reservar"
            style={{
              display: "inline-block",
              padding: "17px 32px",
              background: "#d9b35c",
              color: "#080808",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "18px",
            }}
          >
            AGENDAR CITA
          </a>
        </div>
      </section>

      {/* SERVICIOS */}

      <section
        style={{
          maxWidth: "1100px",
          margin: "auto",
          padding: "80px 20px",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "42px",
            marginBottom: "45px",
          }}
        >
          Servicios
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          {servicios.map((item) => (
            <div
              key={item.nombre}
              style={{
                background: "#151515",
                border: "1px solid #333",
                borderRadius: "16px",
                padding: "32px 20px",
                textAlign: "center",
              }}
            >
              <h3 style={{ fontSize: "21px" }}>
                {item.nombre}
              </h3>

              <p
                style={{
                  color: "#d9b35c",
                  fontSize: "30px",
                  fontWeight: "bold",
                }}
              >
                {item.precio !== null
                  ? `$${item.precio}`
                  : "Consultar"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HORARIO GENERAL */}

      <section
        style={{
          background: "#111",
          textAlign: "center",
          padding: "65px 20px",
        }}
      >
        <h2 style={{ fontSize: "38px" }}>
          Horario
        </h2>

        <p
          style={{
            fontSize: "20px",
            lineHeight: "1.8",
          }}
        >
          <strong>Lunes a viernes</strong>
          <br />
          6:00 PM a 10:00 PM
          <br />
          Citas cada 30 minutos
        </p>

        <p
          style={{
            fontSize: "20px",
            lineHeight: "1.8",
          }}
        >
          <strong>Sábado</strong>
          <br />
          9:00 AM a 10:00 PM
          <br />
          Citas cada 30 minutos
        </p>

        <p
          style={{
            color: "#d9b35c",
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          Domingo abierto — sin citas
        </p>
      </section>

      {/* RESERVACIÓN */}

      <section
        id="reservar"
        style={{
          maxWidth: "850px",
          margin: "auto",
          padding: "80px 20px",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "42px",
          }}
        >
          Agenda tu cita
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#aaa",
            marginBottom: "35px",
          }}
        >
          Elige servicio, día y horario disponible.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del cliente"
            style={{
              padding: "16px",
              borderRadius: "10px",
              fontSize: "17px",
              border: "1px solid #444",
              background: "#fff",
              color: "#111",
            }}
          />

          <select
            value={servicio}
            onChange={(e) => setServicio(e.target.value)}
            style={{
              padding: "16px",
              borderRadius: "10px",
              fontSize: "17px",
            }}
          >
            <option value="">
              Selecciona un servicio
            </option>

            {servicios.map((item) => (
              <option
                key={item.nombre}
                value={item.nombre}
              >
                {item.nombre}
                {item.precio !== null
                  ? ` - $${item.precio}`
                  : ""}
              </option>
            ))}
          </select>

          {/* CALENDARIO VISIBLE */}

          <div>
            <h3
              style={{
                fontSize: "21px",
                marginBottom: "15px",
              }}
            >
              Selecciona el día
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(105px, 1fr))",
                gap: "10px",
              }}
            >
              {diasCalendario.map((dia) => {
                const valor = fechaISO(dia);
                const seleccionado = fecha === valor;
                const domingo = dia.getDay() === 0;

                const nombreDia = new Intl.DateTimeFormat(
                  "es-MX",
                  {
                    weekday: "short",
                  }
                ).format(dia);

                const numeroDia = dia.getDate();

                const nombreMes = new Intl.DateTimeFormat(
                  "es-MX",
                  {
                    month: "short",
                  }
                ).format(dia);

                return (
                  <button
                    key={valor}
                    onClick={() => seleccionarFecha(valor)}
                    style={{
                      padding: "14px 8px",
                      borderRadius: "12px",
                      border: seleccionado
                        ? "2px solid #d9b35c"
                        : "1px solid #444",
                      background: seleccionado
                        ? "#d9b35c"
                        : domingo
                        ? "#243020"
                        : "#1d1d1d",
                      color: seleccionado
                        ? "#000"
                        : "#fff",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: "17px",
                      }}
                    >
                      {nombreDia}
                    </strong>

                    <div
                      style={{
                        fontSize: "25px",
                        fontWeight: "bold",
                        marginTop: "4px",
                      }}
                    >
                      {numeroDia}
                    </div>

                    <div>{nombreMes}</div>

                    {domingo && (
                      <small
                        style={{
                          display: "block",
                          marginTop: "5px",
                        }}
                      >
                        ABIERTO
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FECHA SELECCIONADA */}

          {fecha && (
            <p
              style={{
                color: "#d9b35c",
                textTransform: "capitalize",
                textAlign: "center",
                fontSize: "19px",
                fontWeight: "bold",
              }}
            >
              {fechaBonita(fecha)}
            </p>
          )}

          {/* HORARIOS */}

          {fecha && !esDomingo && (
            <div>
              <h3
                style={{
                  fontSize: "21px",
                  marginBottom: "15px",
                }}
              >
                Horarios disponibles
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "10px",
                }}
              >
                {horariosDisponibles.map((item) => {
                  const ocupado = estaOcupado(item);
                  const pasado = citaYaPaso(item);
                  const deshabilitado =
                    ocupado || pasado;

                  return (
                    <button
                      key={item}
                      disabled={deshabilitado}
                      onClick={() => setHora(item)}
                      style={{
                        padding: "15px 8px",
                        borderRadius: "9px",
                        border:
                          hora === item
                            ? "2px solid #d9b35c"
                            : "1px solid #444",
                        background: ocupado
                          ? "#7a1e1e"
                          : pasado
                          ? "#361515"
                          : hora === item
                          ? "#d9b35c"
                          : "#1d1d1d",
                        color:
                          hora === item &&
                          !deshabilitado
                            ? "#000"
                            : "#fff",
                        cursor: deshabilitado
                          ? "not-allowed"
                          : "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      {horaBonita(item)}

                      {ocupado && (
                        <>
                          <br />
                          <small>OCUPADO</small>
                        </>
                      )}

                      {!ocupado && pasado && (
                        <>
                          <br />
                          <small>NO DISPONIBLE</small>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DOMINGO */}

          {fecha && esDomingo && (
            <div
              style={{
                padding: "22px",
                background: "#172717",
                border: "1px solid #4d854d",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <strong
                style={{
                  fontSize: "22px",
                }}
              >
                DOMINGO ABIERTO
              </strong>

              <p
                style={{
                  marginBottom: 0,
                  color: "#ccc",
                }}
              >
                Los domingos atendemos sin cita.
              </p>
            </div>
          )}

          {!esDomingo && (
            <button
              disabled={!formularioCompleto}
              onClick={confirmarCita}
              style={{
                marginTop: "15px",
                padding: "18px",
                border: "none",
                borderRadius: "10px",
                background: formularioCompleto
                  ? "#25D366"
                  : "#333",
                color: formularioCompleto
                  ? "white"
                  : "#888",
                fontWeight: "bold",
                fontSize: "18px",
                cursor: formularioCompleto
                  ? "pointer"
                  : "not-allowed",
              }}
            >
              Confirmar cita por WhatsApp
            </button>
          )}
        </div>
      </section>

      {/* ADMINISTRACIÓN */}

      <section
        style={{
          background: "#111",
          padding: "55px 20px",
          textAlign: "center",
        }}
      >
        <button
          onClick={() => {
  if (mostrarAdmin) {
    setMostrarAdmin(false);
    setRol(null);
    setUsuario("");
    setContrasena("");
  } else {
    setMostrarAdmin(true);
  }
}}
          style={{
            padding: "13px 22px",
            borderRadius: "9px",
            border: "1px solid #555",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {mostrarAdmin
            ? "Cerrar administración"
            : "Administrar citas"}
        </button>
{mostrarAdmin && !rol && (
  <div
    style={{
      maxWidth: "420px",
      margin: "35px auto",
      padding: "25px",
      background: "#111",
      border: "1px solid #555",
      borderRadius: "12px",
      textAlign: "center",
    }}
  >
    <h2>🔐 Acceso al personal</h2>

    <input
      type="text"
      placeholder="Usuario"
      value={usuario}
      onChange={(e) => setUsuario(e.target.value)}
      style={{
        width: "100%",
        padding: "12px",
        marginBottom: "12px",
        borderRadius: "8px",
      }}
    />

    <input
      type="password"
      placeholder="Contraseña"
      value={contrasena}
      onChange={(e) => setContrasena(e.target.value)}
      style={{
        width: "100%",
        padding: "12px",
        marginBottom: "15px",
        borderRadius: "8px",
      }}
    />

    <button
      onClick={iniciarSesion}
      style={{
        padding: "12px 22px",
        borderRadius: "8px",
        fontWeight: "bold",
        cursor: "pointer",
      }}
    >
      INICIAR SESIÓN
    </button>
  </div>
)}
        {mostrarAdmin && rol && (
          <div
            style={{
              maxWidth: "800px",
              margin: "35px auto 0",
            }}
          >
            <h2>Próximas citas</h2>

            {citasActivas.length === 0 ? (
              <p style={{ color: "#999" }}>
                No hay citas registradas.
              </p>
            ) : (
              citasActivas.map((cita, index) => (
                <div
                  key={`${cita.fecha}-${cita.hora}-${index}`}
                  style={{
                    background: "#1c1c1c",
                    border: "1px solid #333",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "14px",
                    textAlign: "left",
                  }}
                >
                  <strong>{cita.nombre}</strong>

                  <p>
                    {cita.servicio}
                    <br />
                    {fechaBonita(cita.fecha)}
                    <br />
                    {horaBonita(cita.hora)}
                  </p>

                  {rol === "admin" && (
                  <button
                   
                   onClick={() =>
                      cancelarCita(index)
                    }
                    style={{
                      background: "#8d2020",
                      color: "white",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "7px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar cita
                  </button>
                  )}
                   
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <footer
        style={{
          textAlign: "center",
          padding: "30px",
          color: "#777",
          borderTop: "1px solid #222",
        }}
      >
        © 2026 Omar Barber
      </footer>
    </main>
  );
}